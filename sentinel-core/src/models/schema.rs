use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SourceSpan {
    pub file_path: String,
    pub start_byte: usize,
    pub end_byte: usize,
    pub start_line: usize,
    pub start_col: usize,
    pub end_line: usize,
    pub end_col: usize,
}

impl Default for SourceSpan {
    fn default() -> Self {
        Self {
            file_path: String::new(),
            start_byte: 0,
            end_byte: 0,
            start_line: 1,
            start_col: 1,
            end_line: 1,
            end_col: 1,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct NodePosition {
    pub x: f64,
    pub y: f64,
}

impl Default for NodePosition {
    fn default() -> Self {
        Self { x: 0.0, y: 0.0 }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphNode<T> {
    pub id: String,
    pub label: String,
    pub node_type: String,
    pub position: NodePosition,
    pub data: T,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphEdge<T> {
    pub id: String,
    pub source: String,
    pub target: String,
    pub edge_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
    pub animated: bool,
    pub data: T,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct LayerMetrics {
    pub node_count: usize,
    pub edge_count: usize,
    pub density: f64,
    pub computation_duration_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphLayer<N, E> {
    pub layer_name: String,
    pub nodes: Vec<GraphNode<N>>,
    pub edges: Vec<GraphEdge<E>>,
    pub metrics: LayerMetrics,
}

impl<N, E> Default for GraphLayer<N, E> {
    fn default() -> Self {
        Self {
            layer_name: String::new(),
            nodes: Vec::new(),
            edges: Vec::new(),
            metrics: LayerMetrics::default(),
        }
    }
}

// -----------------------------------------------------------------------------
// AST Types
// -----------------------------------------------------------------------------
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AstMetrics {
    pub total_files: usize,
    pub total_nodes: usize,
    pub max_depth: usize,
    pub syntax_errors: usize,
    pub lines_of_code: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AstNodeData {
    pub node_id: usize,
    pub kind: String,
    pub text: String,
    pub span: SourceSpan,
    pub scope_id: usize,
    pub is_named: bool,
    pub children_count: usize,
}

// -----------------------------------------------------------------------------
// CFG Types
// -----------------------------------------------------------------------------
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum TerminatorKind {
    Branch,
    Jump,
    Return,
    Throw,
    Fallthrough,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CfgInstruction {
    pub id: usize,
    pub text: String,
    pub span: SourceSpan,
    pub is_def: bool,
    pub def_vars: Vec<String>,
    pub use_vars: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CfgNode {
    pub block_id: usize,
    pub function_name: String,
    pub file_path: String,
    pub instructions: Vec<CfgInstruction>,
    pub terminator: TerminatorKind,
    pub span: SourceSpan,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum CfgEdgeKind {
    True,
    False,
    Unconditional,
    Exception,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CfgEdge {
    pub condition: CfgEdgeKind,
    pub label: String,
}

// -----------------------------------------------------------------------------
// Call Graph Types
// -----------------------------------------------------------------------------
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CallNode {
    pub symbol: String,
    pub qualified_name: String,
    pub file_path: String,
    pub span: SourceSpan,
    pub parameters: Vec<String>,
    pub is_exported: bool,
    pub is_external: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CallEdge {
    pub caller_symbol: String,
    pub callee_symbol: String,
    pub argument_to_param_map: Vec<(usize, usize)>,
    pub return_flow: bool,
    pub call_site_span: SourceSpan,
}

// -----------------------------------------------------------------------------
// PDG / DDG Types
// -----------------------------------------------------------------------------
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PdgNode {
    pub statement_id: usize,
    pub statement_text: String,
    pub file_path: String,
    pub span: SourceSpan,
    pub defined_vars: Vec<String>,
    pub used_vars: Vec<String>,
    pub block_id: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum DependenceKind {
    Data { variable: String },
    Control { condition: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PdgEdge {
    pub kind: DependenceKind,
    pub variable_or_condition: String,
}

// -----------------------------------------------------------------------------
// Taint Graph Types
// -----------------------------------------------------------------------------
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum TaintRole {
    Source,
    Propagator,
    Sanitizer,
    Sink,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaintNode {
    pub node_id: String,
    pub var_name: String,
    pub role: TaintRole,
    pub category: String,
    pub cwe: Option<String>,
    pub span: SourceSpan,
    pub is_sanitized: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum TaintFlowKind {
    DirectFlow,
    CallArgumentFlow,
    FunctionReturnFlow,
    SanitizedFlow,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaintEdge {
    pub flow_kind: TaintFlowKind,
    pub confidence: String,
    pub traversed_call: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaintFinding {
    pub finding_id: String,
    pub rule_name: String,
    pub severity: String,
    pub cwe: String,
    pub source: TaintNode,
    pub sink: TaintNode,
    pub path_nodes: Vec<TaintNode>,
    pub path_edges: Vec<TaintEdge>,
    pub is_sanitized: bool,
    pub confidence: String,
    pub remediation_suggestion: String,
}

// -----------------------------------------------------------------------------
// Unified Sentinel Graph Report
// -----------------------------------------------------------------------------
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SentinelGraphReport {
    pub repository_url: String,
    pub commit_hash: String,
    pub ast_summary: AstMetrics,
    pub cfg: GraphLayer<CfgNode, CfgEdge>,
    pub call_graph: GraphLayer<CallNode, CallEdge>,
    pub pdg: GraphLayer<PdgNode, PdgEdge>,
    pub taint_graph: GraphLayer<TaintNode, TaintEdge>,
    pub findings: Vec<TaintFinding>,
}
