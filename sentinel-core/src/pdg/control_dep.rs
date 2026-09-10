use crate::models::{CfgNode, DependenceKind, PdgEdge, PdgNode};
use petgraph::graph::{DiGraph, NodeIndex};
use std::collections::HashMap;

pub struct ControlDependenceAnalysis<'a> {
    cfg_graph: &'a DiGraph<CfgNode, crate::models::CfgEdge>,
}

impl<'a> ControlDependenceAnalysis<'a> {
    pub fn new(cfg_graph: &'a DiGraph<CfgNode, crate::models::CfgEdge>) -> Self {
        Self { cfg_graph }
    }

    /// Computes control dependence relationships between CFG blocks.
    /// Returns map: controller_block_id -> Vec<(controlled_block_id, condition_label)>
    pub fn compute_control_dependencies(&self) -> HashMap<usize, Vec<(usize, String)>> {
        let mut control_deps: HashMap<usize, Vec<(usize, String)>> = HashMap::new();

        // If graph is small or linear, establish straightforward block branch dependencies
        for u in self.cfg_graph.node_indices() {
            let u_block = &self.cfg_graph[u];
            let outgoing: Vec<_> = self
                .cfg_graph
                .neighbors_directed(u, petgraph::Direction::Outgoing)
                .collect();

            // A block is a control decision point if it has more than 1 successor
            if outgoing.len() > 1 {
                for v in outgoing {
                    let v_block = &self.cfg_graph[v];
                    let edge_ref = self.cfg_graph.find_edge(u, v).unwrap();
                    let edge_data = &self.cfg_graph[edge_ref];

                    // Statements in v (and reachable from v before re-convergence) are control-dependent on u
                    let label = format!("{:?}", edge_data.condition);
                    control_deps
                        .entry(u_block.block_id)
                        .or_default()
                        .push((v_block.block_id, label));
                }
            }
        }

        control_deps
    }

    /// Connects control dependence edges into the PDG graph
    pub fn inject_control_dependencies(
        &self,
        pdg_graph: &mut DiGraph<PdgNode, PdgEdge>,
        _pdg_node_map: &HashMap<usize, NodeIndex>,
    ) {
        let control_deps = self.compute_control_dependencies();

        // Build mapping: block_id -> list of PDG nodes in that block
        let mut block_to_pdg_nodes: HashMap<usize, Vec<NodeIndex>> = HashMap::new();
        for node_idx in pdg_graph.node_indices() {
            let pdg_node = &pdg_graph[node_idx];
            block_to_pdg_nodes
                .entry(pdg_node.block_id)
                .or_default()
                .push(node_idx);
        }

        for (controller_block, controlled_list) in control_deps {
            // Find the decision instruction in the controller block (last instruction or first)
            let controller_inst_idx = block_to_pdg_nodes
                .get(&controller_block)
                .and_then(|nodes| nodes.last())
                .copied();

            if let Some(controller_pdg_idx) = controller_inst_idx {
                for (controlled_block, condition) in controlled_list {
                    if let Some(controlled_nodes) = block_to_pdg_nodes.get(&controlled_block) {
                        for &controlled_pdg_idx in controlled_nodes {
                            if controller_pdg_idx != controlled_pdg_idx {
                                let edge = PdgEdge {
                                    kind: DependenceKind::Control {
                                        condition: condition.clone(),
                                    },
                                    variable_or_condition: format!("ctrl:{}", condition),
                                };
                                pdg_graph.add_edge(controller_pdg_idx, controlled_pdg_idx, edge);
                            }
                        }
                    }
                }
            }
        }
    }
}
