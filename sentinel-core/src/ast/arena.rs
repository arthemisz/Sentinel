use crate::models::SourceSpan;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub struct NodeId(pub usize);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LexicalScope {
    pub id: usize,
    pub parent_scope: Option<usize>,
    pub bindings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AstNode {
    pub id: NodeId,
    pub kind: String,
    pub is_named: bool,
    pub span: SourceSpan,
    pub text: String,
    pub parent: Option<NodeId>,
    pub children: Vec<NodeId>,
    pub scope_id: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AstArena {
    pub file_path: String,
    pub nodes: Vec<AstNode>,
    pub scopes: Vec<LexicalScope>,
    pub root_id: Option<NodeId>,
}

impl AstArena {
    pub fn new(file_path: String) -> Self {
        let global_scope = LexicalScope {
            id: 0,
            parent_scope: None,
            bindings: Vec::new(),
        };
        Self {
            file_path,
            nodes: Vec::with_capacity(1024),
            scopes: vec![global_scope],
            root_id: None,
        }
    }

    pub fn create_scope(&mut self, parent: Option<usize>) -> usize {
        let id = self.scopes.len();
        self.scopes.push(LexicalScope {
            id,
            parent_scope: parent,
            bindings: Vec::new(),
        });
        id
    }

    pub fn add_binding(&mut self, scope_id: usize, symbol: String) {
        if let Some(scope) = self.scopes.get_mut(scope_id) {
            if !scope.bindings.contains(&symbol) {
                scope.bindings.push(symbol);
            }
        }
    }

    pub fn alloc(
        &mut self,
        kind: String,
        is_named: bool,
        span: SourceSpan,
        text: String,
        parent: Option<NodeId>,
        scope_id: usize,
    ) -> NodeId {
        let id = NodeId(self.nodes.len());
        let node = AstNode {
            id,
            kind,
            is_named,
            span,
            text,
            parent,
            children: Vec::new(),
            scope_id,
        };
        self.nodes.push(node);
        if let Some(p) = parent {
            if let Some(parent_node) = self.nodes.get_mut(p.0) {
                parent_node.children.push(id);
            }
        }
        id
    }

    #[inline(always)]
    pub fn get(&self, id: NodeId) -> Option<&AstNode> {
        self.nodes.get(id.0)
    }

    #[inline(always)]
    pub fn get_mut(&mut self, id: NodeId) -> Option<&mut AstNode> {
        self.nodes.get_mut(id.0)
    }

    pub fn len(&self) -> usize {
        self.nodes.len()
    }

    pub fn is_empty(&self) -> bool {
        self.nodes.is_empty()
    }

    pub fn find_nodes_by_kind(&self, kind: &str) -> Vec<NodeId> {
        self.nodes
            .iter()
            .filter(|n| n.kind == kind)
            .map(|n| n.id)
            .collect()
    }

    pub fn find_nodes_matching<F>(&self, predicate: F) -> Vec<NodeId>
    where
        F: Fn(&AstNode) -> bool,
    {
        self.nodes
            .iter()
            .filter(|n| predicate(n))
            .map(|n| n.id)
            .collect()
    }

    pub fn max_depth(&self) -> usize {
        fn depth_recursive(arena: &AstArena, node_id: NodeId) -> usize {
            if let Some(node) = arena.get(node_id) {
                if node.children.is_empty() {
                    1
                } else {
                    1 + node
                        .children
                        .iter()
                        .map(|c| depth_recursive(arena, *c))
                        .max()
                        .unwrap_or(0)
                }
            } else {
                0
            }
        }

        self.root_id
            .map(|r| depth_recursive(self, r))
            .unwrap_or(0)
    }
}
