use crate::ast::arena::{AstArena, NodeId};
use crate::models::{
    CallEdge, CallNode, GraphEdge, GraphLayer, GraphNode, LayerMetrics, NodePosition, SourceSpan,
};
use petgraph::graph::{DiGraph, NodeIndex};
use petgraph::visit::EdgeRef;
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct FunctionSignature {
    pub symbol: String,
    pub qualified_name: String,
    pub file_path: String,
    pub span: SourceSpan,
    pub parameters: Vec<String>,
    pub is_exported: bool,
    pub node_id: NodeId,
}

pub struct CallGraphResolver<'a> {
    arenas: &'a [AstArena],
    symbol_table: HashMap<String, FunctionSignature>,
    graph: DiGraph<CallNode, CallEdge>,
    node_index_map: HashMap<String, NodeIndex>,
}

impl<'a> CallGraphResolver<'a> {
    pub fn new(arenas: &'a [AstArena]) -> Self {
        Self {
            arenas,
            symbol_table: HashMap::new(),
            graph: DiGraph::new(),
            node_index_map: HashMap::new(),
        }
    }

    pub fn resolve_all(&mut self) -> GraphLayer<CallNode, CallEdge> {
        // Step 1: Collect definitions across all module boundaries
        self.collect_definitions();

        // Step 2: Resolve call sites and instantiate call edges
        self.resolve_call_sites();

        self.to_graph_layer()
    }

    fn collect_definitions(&mut self) {
        for arena in self.arenas {
            let fn_nodes = arena.find_nodes_matching(|n| {
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

            for node_id in fn_nodes {
                if let Some(node) = arena.get(node_id) {
                    let symbol = self.extract_function_name(arena, node_id);
                    let qualified_name = format!("{}::{}", arena.file_path, symbol);
                    let parameters = self.extract_parameters(arena, node_id);
                    let is_exported = self.check_is_exported(arena, node_id);

                    let sig = FunctionSignature {
                        symbol: symbol.clone(),
                        qualified_name: qualified_name.clone(),
                        file_path: arena.file_path.clone(),
                        span: node.span.clone(),
                        parameters: parameters.clone(),
                        is_exported,
                        node_id,
                    };

                    self.symbol_table.insert(qualified_name.clone(), sig.clone());
                    // Also index by bare symbol for unqualified resolution
                    self.symbol_table.entry(symbol.clone()).or_insert(sig);

                    let call_node = CallNode {
                        symbol,
                        qualified_name: qualified_name.clone(),
                        file_path: arena.file_path.clone(),
                        span: node.span.clone(),
                        parameters,
                        is_exported,
                        is_external: false,
                    };

                    let idx = self.graph.add_node(call_node);
                    self.node_index_map.insert(qualified_name, idx);
                }
            }
        }
    }

    fn resolve_call_sites(&mut self) {
        for arena in self.arenas {
            let call_sites = arena.find_nodes_matching(|n| {
                matches!(
                    n.kind.as_str(),
                    "call_expression" | "call" | "method_call"
                )
            });

            for call_id in call_sites {
                let call_node = match arena.get(call_id) {
                    Some(n) => n,
                    None => continue,
                };

                // Identify enclosing caller function
                let caller_symbol = self.find_enclosing_function_symbol(arena, call_id);
                let caller_qname = format!("{}::{}", arena.file_path, caller_symbol);

                // Identify target callee symbol
                let callee_name = self.extract_callee_name(arena, call_id);
                if callee_name.is_empty() {
                    continue;
                }

                // Argument to parameter mapping
                let actual_arg_count = self.count_call_arguments(arena, call_id);
                let mut arg_map = Vec::new();
                for i in 0..actual_arg_count {
                    arg_map.push((i, i)); // Actual Arg_i -> Formal Param_i
                }

                // Check if return value is captured
                let return_flow = self.is_return_value_captured(arena, call_id);

                let callee_qname = self.resolve_callee_symbol(&callee_name, &arena.file_path);

                let caller_idx = self.get_or_create_node(
                    &caller_symbol,
                    &caller_qname,
                    &arena.file_path,
                    call_node.span.clone(),
                    false,
                );

                let callee_idx = self.get_or_create_node(
                    &callee_name,
                    &callee_qname,
                    &arena.file_path,
                    call_node.span.clone(),
                    !self.symbol_table.contains_key(&callee_qname),
                );

                let edge = CallEdge {
                    caller_symbol: caller_symbol.clone(),
                    callee_symbol: callee_name.clone(),
                    argument_to_param_map: arg_map,
                    return_flow,
                    call_site_span: call_node.span.clone(),
                };

                self.graph.add_edge(caller_idx, callee_idx, edge);
            }
        }
    }

    fn resolve_callee_symbol(&self, callee_name: &str, current_file: &str) -> String {
        let qualified_local = format!("{}::{}", current_file, callee_name);
        if self.symbol_table.contains_key(&qualified_local) {
            return qualified_local;
        }

        // Cross-file lookup in symbol table
        if let Some(sig) = self.symbol_table.get(callee_name) {
            return sig.qualified_name.clone();
        }

        // Conservative fallback for external/built-in modules
        format!("external::{}", callee_name)
    }

    fn get_or_create_node(
        &mut self,
        symbol: &str,
        qualified_name: &str,
        file_path: &str,
        span: SourceSpan,
        is_external: bool,
    ) -> NodeIndex {
        if let Some(&idx) = self.node_index_map.get(qualified_name) {
            idx
        } else {
            let call_node = CallNode {
                symbol: symbol.to_string(),
                qualified_name: qualified_name.to_string(),
                file_path: file_path.to_string(),
                span,
                parameters: Vec::new(),
                is_exported: false,
                is_external,
            };
            let idx = self.graph.add_node(call_node);
            self.node_index_map.insert(qualified_name.to_string(), idx);
            idx
        }
    }

    fn extract_function_name(&self, arena: &AstArena, node_id: NodeId) -> String {
        if let Some(node) = arena.get(node_id) {
            for child_id in &node.children {
                if let Some(child) = arena.get(*child_id) {
                    if matches!(child.kind.as_str(), "identifier" | "name" | "property_identifier") {
                        return child.text.clone();
                    }
                }
            }
        }
        format!("fn_{}", node_id.0)
    }

    fn extract_parameters(&self, arena: &AstArena, node_id: NodeId) -> Vec<String> {
        let mut params = Vec::new();
        if let Some(node) = arena.get(node_id) {
            for child_id in &node.children {
                if let Some(child) = arena.get(*child_id) {
                    if matches!(child.kind.as_str(), "formal_parameters" | "parameters" | "parameter_list") {
                        for param_id in &child.children {
                            if let Some(p) = arena.get(*param_id) {
                                if !p.text.is_empty() && p.text != "(" && p.text != ")" && p.text != "," {
                                    params.push(p.text.clone());
                                }
                            }
                        }
                    }
                }
            }
        }
        params
    }

    fn check_is_exported(&self, arena: &AstArena, node_id: NodeId) -> bool {
        if let Some(node) = arena.get(node_id) {
            if let Some(parent_id) = node.parent {
                if let Some(parent) = arena.get(parent_id) {
                    return parent.kind == "export_statement" || parent.text.starts_with("export");
                }
            }
        }
        false
    }

    fn find_enclosing_function_symbol(&self, arena: &AstArena, node_id: NodeId) -> String {
        let mut curr = node_id;
        while let Some(node) = arena.get(curr) {
            if matches!(
                node.kind.as_str(),
                "function_declaration"
                    | "function_expression"
                    | "arrow_function"
                    | "method_definition"
                    | "function_definition"
                    | "function_item"
            ) {
                return self.extract_function_name(arena, curr);
            }
            if let Some(p) = node.parent {
                curr = p;
            } else {
                break;
            }
        }
        "entry".to_string()
    }

    fn extract_callee_name(&self, arena: &AstArena, call_id: NodeId) -> String {
        if let Some(call_node) = arena.get(call_id) {
            if let Some(first_child_id) = call_node.children.first() {
                if let Some(callee) = arena.get(*first_child_id) {
                    if callee.kind == "member_expression" || callee.kind == "field_expression" {
                        // Return method name e.g. query from db.query
                        return callee
                            .children
                            .last()
                            .and_then(|last_id| arena.get(*last_id))
                            .map(|l| l.text.clone())
                            .unwrap_or_else(|| callee.text.clone());
                    }
                    return callee.text.clone();
                }
            }
        }
        String::new()
    }

    fn count_call_arguments(&self, arena: &AstArena, call_id: NodeId) -> usize {
        if let Some(call_node) = arena.get(call_id) {
            for child_id in &call_node.children {
                if let Some(child) = arena.get(*child_id) {
                    if matches!(child.kind.as_str(), "arguments" | "argument_list") {
                        return child
                            .children
                            .iter()
                            .filter(|c| {
                                arena.get(**c).map(|n| n.text != "(" && n.text != ")" && n.text != ",").unwrap_or(false)
                            })
                            .count();
                    }
                }
            }
        }
        0
    }

    fn is_return_value_captured(&self, arena: &AstArena, call_id: NodeId) -> bool {
        if let Some(call_node) = arena.get(call_id) {
            if let Some(p_id) = call_node.parent {
                if let Some(parent) = arena.get(p_id) {
                    return matches!(
                        parent.kind.as_str(),
                        "variable_declarator" | "assignment_expression" | "binary_expression" | "return_statement"
                    );
                }
            }
        }
        false
    }

    pub fn to_graph_layer(&self) -> GraphLayer<CallNode, CallEdge> {
        let mut nodes = Vec::new();
        let mut edges = Vec::new();

        for (i, node_idx) in self.graph.node_indices().enumerate() {
            let call_node = &self.graph[node_idx];
            nodes.push(GraphNode {
                id: format!("call_node_{}", call_node.symbol),
                label: if call_node.is_external {
                    format!("External: {}", call_node.symbol)
                } else {
                    format!("fn {}()", call_node.symbol)
                },
                node_type: if call_node.is_external {
                    "externalCallNode".to_string()
                } else if call_node.is_exported {
                    "exportedCallNode".to_string()
                } else {
                    "internalCallNode".to_string()
                },
                position: NodePosition {
                    x: (i % 4) as f64 * 280.0 + 40.0,
                    y: (i / 4) as f64 * 160.0 + 40.0,
                },
                data: call_node.clone(),
            });
        }

        for edge_ref in self.graph.edge_references() {
            let source = &self.graph[edge_ref.source()];
            let target = &self.graph[edge_ref.target()];
            let edge_data = edge_ref.weight();

            edges.push(GraphEdge {
                id: format!("call_edge_{}_{}", source.symbol, target.symbol),
                source: format!("call_node_{}", source.symbol),
                target: format!("call_node_{}", target.symbol),
                edge_type: if edge_data.return_flow {
                    "callWithReturnEdge".to_string()
                } else {
                    "callEdge".to_string()
                },
                label: Some(format!(
                    "call({} args)",
                    edge_data.argument_to_param_map.len()
                )),
                animated: true,
                data: edge_data.clone(),
            });
        }

        GraphLayer {
            layer_name: "Interprocedural Call Graph (CG)".to_string(),
            metrics: LayerMetrics {
                node_count: nodes.len(),
                edge_count: edges.len(),
                density: if nodes.len() > 1 {
                    edges.len() as f64 / (nodes.len() * (nodes.len() - 1)) as f64
                } else {
                    0.0
                },
                computation_duration_ms: 8,
            },
            nodes,
            edges,
        }
    }

    pub fn underlying_graph(&self) -> &DiGraph<CallNode, CallEdge> {
        &self.graph
    }
}
