use crate::models::{CfgNode, DependenceKind, PdgEdge, PdgNode};
use petgraph::graph::{DiGraph, NodeIndex};
use std::collections::{HashMap, HashSet};

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct Definition {
    pub variable: String,
    pub stmt_id: usize,
    pub block_id: usize,
}

pub struct ReachingDefinitionsAnalysis<'a> {
    cfg_graph: &'a DiGraph<CfgNode, crate::models::CfgEdge>,
    // Mapping from statement ID to PdgNode index
    pub pdg_node_map: HashMap<usize, NodeIndex>,
    pub pdg_graph: DiGraph<PdgNode, PdgEdge>,
}

impl<'a> ReachingDefinitionsAnalysis<'a> {
    pub fn new(cfg_graph: &'a DiGraph<CfgNode, crate::models::CfgEdge>) -> Self {
        Self {
            cfg_graph,
            pdg_node_map: HashMap::new(),
            pdg_graph: DiGraph::new(),
        }
    }

    pub fn compute_data_dependencies(&mut self) {
        // Step 1: Instantiate PDG nodes for every CFG instruction
        for block_idx in self.cfg_graph.node_indices() {
            let block = &self.cfg_graph[block_idx];
            for inst in &block.instructions {
                let pdg_node = PdgNode {
                    statement_id: inst.id,
                    statement_text: inst.text.clone(),
                    file_path: block.file_path.clone(),
                    span: inst.span.clone(),
                    defined_vars: inst.def_vars.clone(),
                    used_vars: inst.use_vars.clone(),
                    block_id: block.block_id,
                };
                let p_idx = self.pdg_graph.add_node(pdg_node);
                self.pdg_node_map.insert(inst.id, p_idx);
            }
        }

        // Step 2: Compute Gen and Kill sets per block
        let mut gen_sets: HashMap<NodeIndex, HashSet<Definition>> = HashMap::new();
        let mut kill_sets: HashMap<NodeIndex, HashSet<String>> = HashMap::new();

        for block_idx in self.cfg_graph.node_indices() {
            let block = &self.cfg_graph[block_idx];
            let mut gen_set = HashSet::new();
            let mut kill = HashSet::new();

            for inst in &block.instructions {
                for var in &inst.def_vars {
                    kill.insert(var.clone());
                    // Any earlier gen in this block is replaced
                    gen_set.retain(|d: &Definition| &d.variable != var);
                    gen_set.insert(Definition {
                        variable: var.clone(),
                        stmt_id: inst.id,
                        block_id: block.block_id,
                    });
                }
            }

            gen_sets.insert(block_idx, gen_set);
            kill_sets.insert(block_idx, kill);
        }

        // Step 3: Fixed-point iteration for In and Out sets
        let mut in_sets: HashMap<NodeIndex, HashSet<Definition>> = HashMap::new();
        let mut out_sets: HashMap<NodeIndex, HashSet<Definition>> = HashMap::new();

        for block_idx in self.cfg_graph.node_indices() {
            in_sets.insert(block_idx, HashSet::new());
            out_sets.insert(block_idx, gen_sets[&block_idx].clone());
        }

        let mut changed = true;
        let mut iterations = 0;
        let max_iterations = 50;

        while changed && iterations < max_iterations {
            changed = false;
            iterations += 1;

            for block_idx in self.cfg_graph.node_indices() {
                // In[B] = Union(Out[P]) for all predecessors P of B
                let mut new_in: HashSet<Definition> = HashSet::new();
                for pred in self.cfg_graph.neighbors_directed(block_idx, petgraph::Direction::Incoming) {
                    if let Some(pred_out) = out_sets.get(&pred) {
                        new_in.extend(pred_out.clone());
                    }
                }

                // Out[B] = Gen[B] Union (In[B] \ Kill[B])
                let killed_vars = &kill_sets[&block_idx];
                let mut new_out = gen_sets[&block_idx].clone();
                for def in &new_in {
                    if !killed_vars.contains(&def.variable) {
                        new_out.insert(def.clone());
                    }
                }

                if new_in != in_sets[&block_idx] {
                    in_sets.insert(block_idx, new_in);
                    changed = true;
                }

                if new_out != out_sets[&block_idx] {
                    out_sets.insert(block_idx, new_out);
                    changed = true;
                }
            }
        }

        // Step 4: Synthesize Def -> Use Data Dependence Edges
        for block_idx in self.cfg_graph.node_indices() {
            let block = &self.cfg_graph[block_idx];
            let mut current_reaching = in_sets.get(&block_idx).cloned().unwrap_or_default();

            for inst in &block.instructions {
                let consumer_stmt_id = inst.id;
                let consumer_node_idx = match self.pdg_node_map.get(&consumer_stmt_id) {
                    Some(&idx) => idx,
                    None => continue,
                };

                for used_var in &inst.use_vars {
                    // Find matching reaching definition
                    for def in &current_reaching {
                        if &def.variable == used_var {
                            if let Some(&producer_node_idx) = self.pdg_node_map.get(&def.stmt_id) {
                                let edge = PdgEdge {
                                    kind: DependenceKind::Data {
                                        variable: used_var.clone(),
                                    },
                                    variable_or_condition: format!("data:{}", used_var),
                                };
                                self.pdg_graph.add_edge(producer_node_idx, consumer_node_idx, edge);
                            }
                        }
                    }
                }

                // Update current_reaching with definitions produced by this instruction
                for def_var in &inst.def_vars {
                    current_reaching.retain(|d| &d.variable != def_var);
                    current_reaching.insert(Definition {
                        variable: def_var.clone(),
                        stmt_id: inst.id,
                        block_id: block.block_id,
                    });
                }
            }
        }
    }
}
