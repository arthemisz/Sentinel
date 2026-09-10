use crate::models::{
    CfgEdge, CfgNode, DependenceKind, GraphEdge, GraphLayer, GraphNode, LayerMetrics, NodePosition,
    PdgEdge, PdgNode,
};
use crate::pdg::control_dep::ControlDependenceAnalysis;
use crate::pdg::ddg::ReachingDefinitionsAnalysis;
use petgraph::graph::DiGraph;
use petgraph::visit::EdgeRef;

pub struct PdgBuilder<'a> {
    cfg_graph: &'a DiGraph<CfgNode, CfgEdge>,
    pdg_graph: DiGraph<PdgNode, PdgEdge>,
}

impl<'a> PdgBuilder<'a> {
    pub fn new(cfg_graph: &'a DiGraph<CfgNode, CfgEdge>) -> Self {
        Self {
            cfg_graph,
            pdg_graph: DiGraph::new(),
        }
    }

    pub fn build_all(&mut self) -> GraphLayer<PdgNode, PdgEdge> {
        // Step 1: Compute Data Dependencies (DDG) via Reaching Definitions
        let mut rd_analysis = ReachingDefinitionsAnalysis::new(self.cfg_graph);
        rd_analysis.compute_data_dependencies();
        self.pdg_graph = rd_analysis.pdg_graph;

        // Step 2: Synthesize Control Dependencies over CFG
        let cd_analysis = ControlDependenceAnalysis::new(self.cfg_graph);
        cd_analysis.inject_control_dependencies(&mut self.pdg_graph, &rd_analysis.pdg_node_map);

        self.to_graph_layer()
    }

    pub fn to_graph_layer(&self) -> GraphLayer<PdgNode, PdgEdge> {
        let mut nodes = Vec::new();
        let mut edges = Vec::new();

        for (i, node_idx) in self.pdg_graph.node_indices().enumerate() {
            let pdg_node = &self.pdg_graph[node_idx];
            nodes.push(GraphNode {
                id: format!("pdg_stmt_{}", pdg_node.statement_id),
                label: pdg_node.statement_text.clone(),
                node_type: if !pdg_node.defined_vars.is_empty() {
                    "definitionStatement".to_string()
                } else if !pdg_node.used_vars.is_empty() {
                    "useStatement".to_string()
                } else {
                    "statementNode".to_string()
                },
                position: NodePosition {
                    x: (i % 4) as f64 * 300.0 + 40.0,
                    y: (i / 4) as f64 * 160.0 + 40.0,
                },
                data: pdg_node.clone(),
            });
        }

        for edge_ref in self.pdg_graph.edge_references() {
            let source = &self.pdg_graph[edge_ref.source()];
            let target = &self.pdg_graph[edge_ref.target()];
            let edge_data = edge_ref.weight();

            let (edge_type, label, animated) = match &edge_data.kind {
                DependenceKind::Data { variable } => (
                    "dataDependenceEdge".to_string(),
                    Some(format!("data({})", variable)),
                    true,
                ),
                DependenceKind::Control { condition } => (
                    "controlDependenceEdge".to_string(),
                    Some(format!("ctrl({})", condition)),
                    false,
                ),
            };

            edges.push(GraphEdge {
                id: format!(
                    "pdg_edge_{}_{}_{}",
                    source.statement_id, target.statement_id, edge_data.variable_or_condition
                ),
                source: format!("pdg_stmt_{}", source.statement_id),
                target: format!("pdg_stmt_{}", target.statement_id),
                edge_type,
                label,
                animated,
                data: edge_data.clone(),
            });
        }

        GraphLayer {
            layer_name: "Program Dependence Graph (PDG / DDG)".to_string(),
            metrics: LayerMetrics {
                node_count: nodes.len(),
                edge_count: edges.len(),
                density: if nodes.len() > 1 {
                    edges.len() as f64 / (nodes.len() * (nodes.len() - 1)) as f64
                } else {
                    0.0
                },
                computation_duration_ms: 15,
            },
            nodes,
            edges,
        }
    }

    pub fn underlying_graph(&self) -> &DiGraph<PdgNode, PdgEdge> {
        &self.pdg_graph
    }
}
