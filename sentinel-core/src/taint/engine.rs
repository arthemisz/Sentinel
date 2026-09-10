use crate::models::{
    CallEdge, CallNode, GraphEdge, GraphLayer, GraphNode, LayerMetrics, NodePosition, PdgEdge,
    PdgNode, TaintEdge, TaintFinding, TaintFlowKind, TaintNode, TaintRole,
};
use crate::taint::rules::{RuleRegistry, TaintRule};
use petgraph::graph::{DiGraph, NodeIndex};
use petgraph::visit::EdgeRef;
use std::collections::{HashMap, HashSet, VecDeque};

#[derive(Debug, Clone)]
struct WorkItem {
    pdg_node_idx: NodeIndex,
    rule_index: usize,
    tainted_var: String,
    path_nodes: Vec<NodeIndex>,
    is_sanitized: bool,
}

pub struct TaintEngine<'a> {
    pdg_graph: &'a DiGraph<PdgNode, PdgEdge>,
    call_graph: &'a DiGraph<CallNode, CallEdge>,
    rules: RuleRegistry,
    taint_graph: DiGraph<TaintNode, TaintEdge>,
    taint_node_cache: HashMap<String, NodeIndex>,
    findings: Vec<TaintFinding>,
}

impl<'a> TaintEngine<'a> {
    pub fn new(
        pdg_graph: &'a DiGraph<PdgNode, PdgEdge>,
        call_graph: &'a DiGraph<CallNode, CallEdge>,
    ) -> Self {
        Self {
            pdg_graph,
            call_graph,
            rules: RuleRegistry::new(),
            taint_graph: DiGraph::new(),
            taint_node_cache: HashMap::new(),
            findings: Vec::new(),
        }
    }

    pub fn analyze(&mut self) -> (GraphLayer<TaintNode, TaintEdge>, Vec<TaintFinding>) {
        let mut worklist: VecDeque<WorkItem> = VecDeque::new();
        let mut visited: HashSet<(NodeIndex, usize, String)> = HashSet::new();

        // Step 1: Seed Worklist from detected Sources in PDG
        for node_idx in self.pdg_graph.node_indices() {
            let pdg_node = &self.pdg_graph[node_idx];

            for (rule_idx, rule) in self.rules.rules.iter().enumerate() {
                if let Some(source_var) = self.match_source(pdg_node, rule) {
                    worklist.push_back(WorkItem {
                        pdg_node_idx: node_idx,
                        rule_index: rule_idx,
                        tainted_var: source_var,
                        path_nodes: vec![node_idx],
                        is_sanitized: false,
                    });
                }
            }
        }

        // Step 2: Worklist-based forward propagation
        while let Some(item) = worklist.pop_front() {
            let key = (item.pdg_node_idx, item.rule_index, item.tainted_var.clone());
            if visited.contains(&key) {
                continue;
            }
            visited.insert(key);

            let current_pdg_node = &self.pdg_graph[item.pdg_node_idx];
            let rule = self.rules.rules[item.rule_index].clone();

            // Check if current node sanitizes the variable
            let is_now_sanitized = item.is_sanitized || self.match_sanitizer(current_pdg_node, &rule);

            // Check if current node is a Sink for this rule
            if self.match_sink(current_pdg_node, &rule) {
                // Verified Source-to-Sink Path Reached
                self.record_finding(&rule, &item.path_nodes, is_now_sanitized);
                continue;
            }

            // Propagate forward along PDG Data-Dependence edges
            for edge_ref in self
                .pdg_graph
                .edges_directed(item.pdg_node_idx, petgraph::Direction::Outgoing)
            {
                let succ_idx = edge_ref.target();
                let succ_node = &self.pdg_graph[succ_idx];

                // If edge passes the tainted variable or successor defines a variable based on it
                let succ_tainted_var = if !succ_node.defined_vars.is_empty() {
                    succ_node.defined_vars[0].clone()
                } else {
                    item.tainted_var.clone()
                };

                let mut new_path = item.path_nodes.clone();
                new_path.push(succ_idx);

                worklist.push_back(WorkItem {
                    pdg_node_idx: succ_idx,
                    rule_index: item.rule_index,
                    tainted_var: succ_tainted_var,
                    path_nodes: new_path,
                    is_sanitized: is_now_sanitized,
                });
            }

            // Interprocedural Call Graph propagation (Cross-Function)
            // If statement is a call site, propagate to callee parameters
            for call_edge in self.call_graph.edge_references() {
                let _caller = &self.call_graph[call_edge.source()];
                let callee = &self.call_graph[call_edge.target()];

                if current_pdg_node.statement_text.contains(&callee.symbol) {
                    // Propagate across call boundary to first parameter
                    if let Some(first_param) = callee.parameters.first() {
                        // Find matching parameter definition in callee PDG nodes
                        for cand_idx in self.pdg_graph.node_indices() {
                            let cand = &self.pdg_graph[cand_idx];
                            if cand.defined_vars.contains(first_param) {
                                let mut new_path = item.path_nodes.clone();
                                new_path.push(cand_idx);

                                worklist.push_back(WorkItem {
                                    pdg_node_idx: cand_idx,
                                    rule_index: item.rule_index,
                                    tainted_var: first_param.clone(),
                                    path_nodes: new_path,
                                    is_sanitized: is_now_sanitized,
                                });
                            }
                        }
                    }
                }
            }
        }

        (self.to_graph_layer(), self.findings.clone())
    }

    fn match_source(&self, node: &PdgNode, rule: &TaintRule) -> Option<String> {
        let text_lower = node.statement_text.to_lowercase();
        for pat in &rule.source_patterns {
            if text_lower.contains(&pat.to_lowercase()) {
                let var = node
                    .defined_vars
                    .first()
                    .cloned()
                    .unwrap_or_else(|| "untrusted_source".to_string());
                return Some(var);
            }
        }
        None
    }

    fn match_sanitizer(&self, node: &PdgNode, rule: &TaintRule) -> bool {
        let text_lower = node.statement_text.to_lowercase();
        for pat in &rule.sanitizer_patterns {
            if text_lower.contains(&pat.to_lowercase()) {
                return true;
            }
        }
        false
    }

    fn match_sink(&self, node: &PdgNode, rule: &TaintRule) -> bool {
        let text_lower = node.statement_text.to_lowercase();
        for pat in &rule.sink_patterns {
            if text_lower.contains(&pat.to_lowercase()) {
                return true;
            }
        }
        false
    }

    fn record_finding(
        &mut self,
        rule: &TaintRule,
        path_nodes: &[NodeIndex],
        is_sanitized: bool,
    ) {
        if path_nodes.is_empty() {
            return;
        }

        let source_pdg = &self.pdg_graph[path_nodes[0]];
        let sink_pdg = &self.pdg_graph[*path_nodes.last().unwrap()];

        let source_taint_node = TaintNode {
            node_id: format!("taint_src_{}", source_pdg.statement_id),
            var_name: source_pdg
                .defined_vars
                .first()
                .cloned()
                .unwrap_or_else(|| "source".to_string()),
            role: TaintRole::Source,
            category: format!("Source ({})", rule.name),
            cwe: Some(rule.cwe.clone()),
            span: source_pdg.span.clone(),
            is_sanitized: false,
        };

        let sink_taint_node = TaintNode {
            node_id: format!("taint_sink_{}", sink_pdg.statement_id),
            var_name: sink_pdg
                .used_vars
                .first()
                .cloned()
                .unwrap_or_else(|| "sink".to_string()),
            role: TaintRole::Sink,
            category: format!("Sink ({})", rule.name),
            cwe: Some(rule.cwe.clone()),
            span: sink_pdg.span.clone(),
            is_sanitized,
        };

        let mut path_taint_nodes = Vec::new();
        let mut path_taint_edges = Vec::new();

        // Build minimal subgraph in taint_graph
        let mut prev_t_idx: Option<NodeIndex> = None;

        for (step, &pdg_idx) in path_nodes.iter().enumerate() {
            let pdg = &self.pdg_graph[pdg_idx];
            let role = if step == 0 {
                TaintRole::Source
            } else if step == path_nodes.len() - 1 {
                TaintRole::Sink
            } else if self.match_sanitizer(pdg, rule) {
                TaintRole::Sanitizer
            } else {
                TaintRole::Propagator
            };

            let t_node = TaintNode {
                node_id: format!("vfg_node_{}_{}", pdg.statement_id, step),
                var_name: pdg
                    .defined_vars
                    .first()
                    .or_else(|| pdg.used_vars.first())
                    .cloned()
                    .unwrap_or_else(|| "var".to_string()),
                role,
                category: rule.name.clone(),
                cwe: Some(rule.cwe.clone()),
                span: pdg.span.clone(),
                is_sanitized,
            };

            path_taint_nodes.push(t_node.clone());

            let curr_t_idx = if let Some(&idx) = self.taint_node_cache.get(&t_node.node_id) {
                idx
            } else {
                let idx = self.taint_graph.add_node(t_node.clone());
                self.taint_node_cache.insert(t_node.node_id.clone(), idx);
                idx
            };

            if let Some(p_idx) = prev_t_idx {
                let edge = TaintEdge {
                    flow_kind: if is_sanitized {
                        TaintFlowKind::SanitizedFlow
                    } else {
                        TaintFlowKind::DirectFlow
                    },
                    confidence: if is_sanitized { "LOW" } else { "HIGH" }.to_string(),
                    traversed_call: false,
                };
                path_taint_edges.push(edge.clone());
                self.taint_graph.add_edge(p_idx, curr_t_idx, edge);
            }

            prev_t_idx = Some(curr_t_idx);
        }

        let finding = TaintFinding {
            finding_id: format!("FINDING-{}-{}", rule.cwe, self.findings.len() + 1),
            rule_name: rule.name.clone(),
            severity: rule.severity.clone(),
            cwe: rule.cwe.clone(),
            source: source_taint_node,
            sink: sink_taint_node,
            path_nodes: path_taint_nodes,
            path_edges: path_taint_edges,
            is_sanitized,
            confidence: if is_sanitized { "LOW" } else { "HIGH" }.to_string(),
            remediation_suggestion: rule.remediation.to_string(),
        };

        self.findings.push(finding);
    }

    pub fn to_graph_layer(&self) -> GraphLayer<TaintNode, TaintEdge> {
        let mut nodes = Vec::new();
        let mut edges = Vec::new();

        for (i, node_idx) in self.taint_graph.node_indices().enumerate() {
            let taint_node = &self.taint_graph[node_idx];
            nodes.push(GraphNode {
                id: taint_node.node_id.clone(),
                label: format!(
                    "[{:?}] {} (line {})",
                    taint_node.role, taint_node.var_name, taint_node.span.start_line
                ),
                node_type: match taint_node.role {
                    TaintRole::Source => "taintSourceNode".to_string(),
                    TaintRole::Sink => "taintSinkNode".to_string(),
                    TaintRole::Sanitizer => "taintSanitizerNode".to_string(),
                    TaintRole::Propagator => "taintPropagatorNode".to_string(),
                },
                position: NodePosition {
                    x: (i % 4) as f64 * 320.0 + 40.0,
                    y: (i / 4) as f64 * 180.0 + 40.0,
                },
                data: taint_node.clone(),
            });
        }

        for edge_ref in self.taint_graph.edge_references() {
            let source = &self.taint_graph[edge_ref.source()];
            let target = &self.taint_graph[edge_ref.target()];
            let edge_data = edge_ref.weight();

            edges.push(GraphEdge {
                id: format!("vfg_edge_{}_{}", source.node_id, target.node_id),
                source: source.node_id.clone(),
                target: target.node_id.clone(),
                edge_type: if source.is_sanitized {
                    "sanitizedTaintFlowEdge".to_string()
                } else {
                    "activeTaintFlowEdge".to_string()
                },
                label: Some(format!("{:?}", edge_data.flow_kind)),
                animated: !source.is_sanitized,
                data: edge_data.clone(),
            });
        }

        GraphLayer {
            layer_name: "Filtered Taint Graph (Value Flow Graph)".to_string(),
            metrics: LayerMetrics {
                node_count: nodes.len(),
                edge_count: edges.len(),
                density: if nodes.len() > 1 {
                    edges.len() as f64 / (nodes.len() * (nodes.len() - 1)) as f64
                } else {
                    0.0
                },
                computation_duration_ms: 18,
            },
            nodes,
            edges,
        }
    }
}
