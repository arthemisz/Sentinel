use crate::ast::arena::{AstArena, NodeId};
use crate::models::{
    CfgEdge, CfgEdgeKind, CfgInstruction, CfgNode, GraphEdge, GraphLayer, GraphNode, LayerMetrics,
    NodePosition, SourceSpan, TerminatorKind,
};
use petgraph::graph::{DiGraph, NodeIndex};
use petgraph::visit::EdgeRef;
use std::collections::HashMap;

pub struct CfgBuilder<'a> {
    arena: &'a AstArena,
    graph: DiGraph<CfgNode, CfgEdge>,
    block_counter: usize,
    inst_counter: usize,
}

impl<'a> CfgBuilder<'a> {
    pub fn new(arena: &'a AstArena) -> Self {
        Self {
            arena,
            graph: DiGraph::new(),
            block_counter: 0,
            inst_counter: 0,
        }
    }

    pub fn build_all(&mut self) -> GraphLayer<CfgNode, CfgEdge> {
        let function_nodes = self.arena.find_nodes_matching(|n| {
            matches!(
                n.kind.as_str(),
                "function_declaration"
                    | "function_expression"
                    | "arrow_function"
                    | "method_definition"
                    | "function_definition"
                    | "function_item"
            )
        });

        if function_nodes.is_empty() {
            // Build CFG for top-level script statements
            if let Some(root) = self.arena.root_id {
                self.build_function_cfg("main", root);
            }
        } else {
            for fn_id in function_nodes {
                let name = self.extract_function_name(fn_id);
                self.build_function_cfg(&name, fn_id);
            }
        }

        self.to_graph_layer()
    }

    pub fn build_function_cfg(&mut self, fn_name: &str, fn_node_id: NodeId) -> (NodeIndex, NodeIndex) {
        let entry_idx = self.create_block(fn_name, TerminatorKind::Fallthrough);
        let exit_idx = self.create_block(fn_name, TerminatorKind::Return);

        let fn_node = match self.arena.get(fn_node_id) {
            Some(n) => n,
            None => return (entry_idx, exit_idx),
        };

        // Find body node (block, statement_block, compound_statement)
        let body_node = fn_node
            .children
            .iter()
            .find(|c| {
                if let Some(node) = self.arena.get(**c) {
                    matches!(
                        node.kind.as_str(),
                        "statement_block" | "block" | "compound_statement"
                    )
                } else {
                    false
                }
            })
            .copied()
            .unwrap_or(fn_node_id);

        let current_block = entry_idx;
        let last_block = self.process_block_statements(fn_name, body_node, current_block, exit_idx);

        // Connect last block to exit if not already terminated
        if !self.has_outgoing_edge(last_block) {
            self.add_edge(last_block, exit_idx, CfgEdgeKind::Unconditional, "unconditional");
        }

        (entry_idx, exit_idx)
    }

    fn process_block_statements(
        &mut self,
        fn_name: &str,
        block_node_id: NodeId,
        mut current_block: NodeIndex,
        exit_block: NodeIndex,
    ) -> NodeIndex {
        let block_node = match self.arena.get(block_node_id) {
            Some(n) => n,
            None => return current_block,
        };

        let statements: Vec<NodeId> = block_node.children.clone();

        for stmt_id in statements {
            let stmt = match self.arena.get(stmt_id) {
                Some(s) => s,
                None => continue,
            };

            match stmt.kind.as_str() {
                "if_statement" => {
                    current_block = self.process_if_statement(fn_name, stmt_id, current_block, exit_block);
                }
                "while_statement" | "for_statement" | "for_in_statement" | "for_of_statement" => {
                    current_block = self.process_loop_statement(fn_name, stmt_id, current_block, exit_block);
                }
                "try_statement" => {
                    current_block = self.process_try_statement(fn_name, stmt_id, current_block, exit_block);
                }
                "return_statement" => {
                    let inst = self.make_instruction(stmt_id);
                    self.add_instruction(current_block, inst);
                    self.set_terminator(current_block, TerminatorKind::Return);
                    self.add_edge(current_block, exit_block, CfgEdgeKind::Unconditional, "return");
                    // Create new unreachable block for any subsequent statements
                    current_block = self.create_block(fn_name, TerminatorKind::Fallthrough);
                }
                "throw_statement" => {
                    let inst = self.make_instruction(stmt_id);
                    self.add_instruction(current_block, inst);
                    self.set_terminator(current_block, TerminatorKind::Throw);
                    self.add_edge(current_block, exit_block, CfgEdgeKind::Exception, "throw");
                    current_block = self.create_block(fn_name, TerminatorKind::Fallthrough);
                }
                "break_statement" | "continue_statement" => {
                    let inst = self.make_instruction(stmt_id);
                    self.add_instruction(current_block, inst);
                    self.set_terminator(current_block, TerminatorKind::Jump);
                    // Creates new block for following statements
                    current_block = self.create_block(fn_name, TerminatorKind::Fallthrough);
                }
                _ => {
                    // Check for short-circuit logic in expression statements
                    if self.contains_short_circuit(stmt_id) {
                        current_block = self.process_short_circuit_expr(fn_name, stmt_id, current_block);
                    } else {
                        let inst = self.make_instruction(stmt_id);
                        self.add_instruction(current_block, inst);
                    }
                }
            }
        }

        current_block
    }

    fn process_if_statement(
        &mut self,
        fn_name: &str,
        if_node_id: NodeId,
        current_block: NodeIndex,
        exit_block: NodeIndex,
    ) -> NodeIndex {
        let if_node = match self.arena.get(if_node_id) {
            Some(n) => n,
            None => return current_block,
        };

        // Branch condition instruction
        let condition_text = if_node
            .children
            .first()
            .and_then(|c| self.arena.get(*c))
            .map(|c| c.text.clone())
            .unwrap_or_else(|| "condition".to_string());

        let cond_inst = CfgInstruction {
            id: self.next_inst_id(),
            text: format!("Branch Condition: {}", condition_text),
            span: if_node.span.clone(),
            is_def: false,
            def_vars: Vec::new(),
            use_vars: self.extract_variables_from_text(&condition_text),
        };
        self.add_instruction(current_block, cond_inst);
        self.set_terminator(current_block, TerminatorKind::Branch);

        let then_block = self.create_block(fn_name, TerminatorKind::Fallthrough);
        let join_block = self.create_block(fn_name, TerminatorKind::Fallthrough);

        self.add_edge(current_block, then_block, CfgEdgeKind::True, "true");

        // Find then branch and else branch
        let mut then_node_id = None;
        let mut else_node_id = None;

        for (i, child_id) in if_node.children.iter().enumerate() {
            if i == 0 {
                continue; // condition
            }
            if let Some(child) = self.arena.get(*child_id) {
                if child.kind == "else_clause" {
                    else_node_id = child.children.first().copied();
                } else if then_node_id.is_none() {
                    then_node_id = Some(*child_id);
                }
            }
        }

        let then_last = if let Some(tn) = then_node_id {
            self.process_block_statements(fn_name, tn, then_block, exit_block)
        } else {
            then_block
        };

        if !self.has_outgoing_edge(then_last) {
            self.add_edge(then_last, join_block, CfgEdgeKind::Unconditional, "fallthrough");
        }

        if let Some(en) = else_node_id {
            let else_block = self.create_block(fn_name, TerminatorKind::Fallthrough);
            self.add_edge(current_block, else_block, CfgEdgeKind::False, "false");
            let else_last = self.process_block_statements(fn_name, en, else_block, exit_block);
            if !self.has_outgoing_edge(else_last) {
                self.add_edge(else_last, join_block, CfgEdgeKind::Unconditional, "fallthrough");
            }
        } else {
            self.add_edge(current_block, join_block, CfgEdgeKind::False, "false");
        }

        join_block
    }

    fn process_loop_statement(
        &mut self,
        fn_name: &str,
        loop_node_id: NodeId,
        current_block: NodeIndex,
        exit_block: NodeIndex,
    ) -> NodeIndex {
        let loop_node = match self.arena.get(loop_node_id) {
            Some(n) => n,
            None => return current_block,
        };

        let header_block = self.create_block(fn_name, TerminatorKind::Branch);
        let body_block = self.create_block(fn_name, TerminatorKind::Fallthrough);
        let loop_exit_block = self.create_block(fn_name, TerminatorKind::Fallthrough);

        self.add_edge(current_block, header_block, CfgEdgeKind::Unconditional, "loop_entry");

        let loop_inst = CfgInstruction {
            id: self.next_inst_id(),
            text: format!("Loop Test: {}", loop_node.kind),
            span: loop_node.span.clone(),
            is_def: false,
            def_vars: Vec::new(),
            use_vars: Vec::new(),
        };
        self.add_instruction(header_block, loop_inst);

        self.add_edge(header_block, body_block, CfgEdgeKind::True, "loop_body");
        self.add_edge(header_block, loop_exit_block, CfgEdgeKind::False, "loop_exit");

        // Find body child
        let body_child = loop_node.children.iter().find(|c| {
            if let Some(node) = self.arena.get(**c) {
                matches!(
                    node.kind.as_str(),
                    "statement_block" | "block" | "compound_statement" | "expression_statement"
                )
            } else {
                false
            }
        });

        let body_last = if let Some(bc) = body_child {
            self.process_block_statements(fn_name, *bc, body_block, exit_block)
        } else {
            body_block
        };

        if !self.has_outgoing_edge(body_last) {
            self.add_edge(body_last, header_block, CfgEdgeKind::Unconditional, "loop_back");
        }

        loop_exit_block
    }

    fn process_try_statement(
        &mut self,
        fn_name: &str,
        try_node_id: NodeId,
        current_block: NodeIndex,
        exit_block: NodeIndex,
    ) -> NodeIndex {
        let try_node = match self.arena.get(try_node_id) {
            Some(n) => n,
            None => return current_block,
        };

        let try_body_block = self.create_block(fn_name, TerminatorKind::Fallthrough);
        let catch_block = self.create_block(fn_name, TerminatorKind::Fallthrough);
        let join_block = self.create_block(fn_name, TerminatorKind::Fallthrough);

        self.add_edge(current_block, try_body_block, CfgEdgeKind::Unconditional, "try");
        // Exception edge from try body to catch handler
        self.add_edge(try_body_block, catch_block, CfgEdgeKind::Exception, "on_exception");

        let try_child = try_node.children.first().copied();
        let try_last = if let Some(tc) = try_child {
            self.process_block_statements(fn_name, tc, try_body_block, exit_block)
        } else {
            try_body_block
        };

        if !self.has_outgoing_edge(try_last) {
            self.add_edge(try_last, join_block, CfgEdgeKind::Unconditional, "fallthrough");
        }

        // Find catch handler
        let catch_child = try_node.children.iter().find(|c| {
            self.arena.get(**c).map(|n| n.kind == "catch_clause").unwrap_or(false)
        });

        let catch_last = if let Some(cc) = catch_child {
            self.process_block_statements(fn_name, *cc, catch_block, exit_block)
        } else {
            catch_block
        };

        if !self.has_outgoing_edge(catch_last) {
            self.add_edge(catch_last, join_block, CfgEdgeKind::Unconditional, "handled");
        }

        join_block
    }

    fn process_short_circuit_expr(
        &mut self,
        fn_name: &str,
        node_id: NodeId,
        current_block: NodeIndex,
    ) -> NodeIndex {
        let node = match self.arena.get(node_id) {
            Some(n) => n,
            None => return current_block,
        };

        let is_and = node.text.contains("&&");
        let next_eval_block = self.create_block(fn_name, TerminatorKind::Fallthrough);
        let join_block = self.create_block(fn_name, TerminatorKind::Fallthrough);

        let test_inst = CfgInstruction {
            id: self.next_inst_id(),
            text: format!("Short-Circuit Evaluation: {}", node.text),
            span: node.span.clone(),
            is_def: false,
            def_vars: Vec::new(),
            use_vars: self.extract_variables_from_text(&node.text),
        };
        self.add_instruction(current_block, test_inst);
        self.set_terminator(current_block, TerminatorKind::Branch);

        if is_and {
            // If true, must evaluate RHS; if false, short-circuits directly to join
            self.add_edge(current_block, next_eval_block, CfgEdgeKind::True, "eval_rhs");
            self.add_edge(current_block, join_block, CfgEdgeKind::False, "short_circuit_false");
        } else {
            // For ||, if true, short-circuits; if false, evaluates RHS
            self.add_edge(current_block, join_block, CfgEdgeKind::True, "short_circuit_true");
            self.add_edge(current_block, next_eval_block, CfgEdgeKind::False, "eval_rhs");
        }

        self.add_edge(next_eval_block, join_block, CfgEdgeKind::Unconditional, "join");
        join_block
    }

    fn contains_short_circuit(&self, node_id: NodeId) -> bool {
        if let Some(node) = self.arena.get(node_id) {
            node.text.contains("&&") || node.text.contains("||") || node.text.contains('?')
        } else {
            false
        }
    }

    fn create_block(&mut self, fn_name: &str, terminator: TerminatorKind) -> NodeIndex {
        let block_id = self.block_counter;
        self.block_counter += 1;

        let node = CfgNode {
            block_id,
            function_name: fn_name.to_string(),
            file_path: self.arena.file_path.clone(),
            instructions: Vec::new(),
            terminator,
            span: SourceSpan::default(),
        };

        self.graph.add_node(node)
    }

    fn add_instruction(&mut self, block: NodeIndex, inst: CfgInstruction) {
        if let Some(cfg_node) = self.graph.node_weight_mut(block) {
            if cfg_node.instructions.is_empty() {
                cfg_node.span = inst.span.clone();
            } else {
                cfg_node.span.end_byte = inst.span.end_byte;
                cfg_node.span.end_line = inst.span.end_line;
                cfg_node.span.end_col = inst.span.end_col;
            }
            cfg_node.instructions.push(inst);
        }
    }

    fn set_terminator(&mut self, block: NodeIndex, terminator: TerminatorKind) {
        if let Some(cfg_node) = self.graph.node_weight_mut(block) {
            cfg_node.terminator = terminator;
        }
    }

    fn add_edge(&mut self, from: NodeIndex, to: NodeIndex, condition: CfgEdgeKind, label: &str) {
        let edge = CfgEdge {
            condition,
            label: label.to_string(),
        };
        self.graph.add_edge(from, to, edge);
    }

    fn has_outgoing_edge(&self, block: NodeIndex) -> bool {
        self.graph
            .neighbors_directed(block, petgraph::Direction::Outgoing)
            .count()
            > 0
    }

    fn next_inst_id(&mut self) -> usize {
        let id = self.inst_counter;
        self.inst_counter += 1;
        id
    }

    fn make_instruction(&mut self, node_id: NodeId) -> CfgInstruction {
        let id = self.next_inst_id();
        if let Some(node) = self.arena.get(node_id) {
            let (is_def, def_vars, use_vars) = self.analyze_def_use(&node.text);
            CfgInstruction {
                id,
                text: node.text.clone(),
                span: node.span.clone(),
                is_def,
                def_vars,
                use_vars,
            }
        } else {
            CfgInstruction {
                id,
                text: String::new(),
                span: SourceSpan::default(),
                is_def: false,
                def_vars: Vec::new(),
                use_vars: Vec::new(),
            }
        }
    }

    fn analyze_def_use(&self, text: &str) -> (bool, Vec<String>, Vec<String>) {
        let mut def_vars = Vec::new();
        let mut use_vars = Vec::new();

        if let Some((lhs, rhs)) = text.split_once('=') {
            let var = lhs
                .trim()
                .trim_start_matches("let ")
                .trim_start_matches("const ")
                .trim_start_matches("var ")
                .trim_start_matches("mut ")
                .split_whitespace()
                .next()
                .unwrap_or("")
                .trim_matches(|c: char| !c.is_alphanumeric() && c != '_');

            if !var.is_empty() {
                def_vars.push(var.to_string());
            }

            for token in rhs.split(|c: char| !c.is_alphanumeric() && c != '_') {
                let t = token.trim();
                if !t.is_empty() && !t.chars().next().unwrap_or('0').is_numeric() && t != var {
                    if !use_vars.contains(&t.to_string()) {
                        use_vars.push(t.to_string());
                    }
                }
            }
            (true, def_vars, use_vars)
        } else {
            for token in text.split(|c: char| !c.is_alphanumeric() && c != '_') {
                let t = token.trim();
                if !t.is_empty() && !t.chars().next().unwrap_or('0').is_numeric() {
                    if !use_vars.contains(&t.to_string()) {
                        use_vars.push(t.to_string());
                    }
                }
            }
            (!def_vars.is_empty(), def_vars, use_vars)
        }
    }

    fn extract_variables_from_text(&self, text: &str) -> Vec<String> {
        let mut vars = Vec::new();
        for token in text.split(|c: char| !c.is_alphanumeric() && c != '_') {
            let t = token.trim();
            if !t.is_empty()
                && !t.chars().next().unwrap_or('0').is_numeric()
                && !["if", "else", "while", "for", "return", "true", "false", "null", "undefined"]
                    .contains(&t)
            {
                if !vars.contains(&t.to_string()) {
                    vars.push(t.to_string());
                }
            }
        }
        vars
    }

    fn extract_function_name(&self, node_id: NodeId) -> String {
        if let Some(node) = self.arena.get(node_id) {
            for child_id in &node.children {
                if let Some(child) = self.arena.get(*child_id) {
                    if child.kind == "identifier" || child.kind == "name" || child.kind == "property_identifier" {
                        return child.text.clone();
                    }
                }
            }
        }
        format!("anonymous_fn_{}", node_id.0)
    }

    pub fn to_graph_layer(&self) -> GraphLayer<CfgNode, CfgEdge> {
        let mut nodes = Vec::new();
        let mut edges = Vec::new();

        // Compute 2D React Flow layout coordinates
        let depth_map: HashMap<NodeIndex, usize> = HashMap::new();
        for (i, node_idx) in self.graph.node_indices().enumerate() {
            let depth = depth_map.get(&node_idx).copied().unwrap_or(i);
            let cfg_node = &self.graph[node_idx];

            nodes.push(GraphNode {
                id: format!("cfg_bb_{}", cfg_node.block_id),
                label: format!("{}: Block #{}", cfg_node.function_name, cfg_node.block_id),
                node_type: match cfg_node.terminator {
                    TerminatorKind::Return => "exitBlock".to_string(),
                    TerminatorKind::Branch => "branchBlock".to_string(),
                    TerminatorKind::Throw => "exceptionBlock".to_string(),
                    _ => "basicBlock".to_string(),
                },
                position: NodePosition {
                    x: (depth % 3) as f64 * 320.0 + 50.0,
                    y: (depth / 3) as f64 * 180.0 + 50.0,
                },
                data: cfg_node.clone(),
            });
        }

        for edge_ref in self.graph.edge_references() {
            let source_node = &self.graph[edge_ref.source()];
            let target_node = &self.graph[edge_ref.target()];
            let edge_data = edge_ref.weight();

            edges.push(GraphEdge {
                id: format!("cfg_edge_{}_{}", source_node.block_id, target_node.block_id),
                source: format!("cfg_bb_{}", source_node.block_id),
                target: format!("cfg_bb_{}", target_node.block_id),
                edge_type: match edge_data.condition {
                    CfgEdgeKind::Exception => "exceptionEdge".to_string(),
                    CfgEdgeKind::True => "trueBranchEdge".to_string(),
                    CfgEdgeKind::False => "falseBranchEdge".to_string(),
                    CfgEdgeKind::Unconditional => "unconditionalEdge".to_string(),
                },
                label: Some(edge_data.label.clone()),
                animated: edge_data.condition == CfgEdgeKind::True,
                data: edge_data.clone(),
            });
        }

        GraphLayer {
            layer_name: "Control Flow Graph (CFG)".to_string(),
            metrics: LayerMetrics {
                node_count: nodes.len(),
                edge_count: edges.len(),
                density: if nodes.len() > 1 {
                    edges.len() as f64 / (nodes.len() * (nodes.len() - 1)) as f64
                } else {
                    0.0
                },
                computation_duration_ms: 12,
            },
            nodes,
            edges,
        }
    }

    pub fn underlying_graph(&self) -> &DiGraph<CfgNode, CfgEdge> {
        &self.graph
    }
}
