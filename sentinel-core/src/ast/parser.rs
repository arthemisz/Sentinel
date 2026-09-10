use crate::ast::arena::{AstArena, NodeId};
use crate::ast::language::SupportedLanguage;
use crate::models::SourceSpan;
use anyhow::{Context, Result};
use tree_sitter::{Node as TsNode, Parser as TsParser, Point};

pub struct SourceParser {
    parser: TsParser,
    language: SupportedLanguage,
}

impl SourceParser {
    pub fn new(language: SupportedLanguage) -> Result<Self> {
        let mut parser = TsParser::new();
        if let Some(ts_lang) = language.tree_sitter_language() {
            parser
                .set_language(&ts_lang)
                .map_err(|e| anyhow::anyhow!("Failed to set tree-sitter language: {:?}", e))?;
        }
        Ok(Self { parser, language })
    }

    pub fn parse(&mut self, source_code: &str, file_path: &str) -> Result<AstArena> {
        if self.language == SupportedLanguage::Unknown {
            // If unknown, fallback or return empty arena
            return Ok(AstArena::new(file_path.to_string()));
        }

        let tree = self
            .parser
            .parse(source_code, None)
            .context("Tree-sitter parse failure")?;

        let mut arena = AstArena::new(file_path.to_string());
        let root_node = tree.root_node();
        let source_bytes = source_code.as_bytes();

        let root_id = Self::build_arena_recursive(
            &mut arena,
            root_node,
            source_bytes,
            file_path,
            None,
            0, // Global scope
        );

        arena.root_id = Some(root_id);
        Ok(arena)
    }

    fn build_arena_recursive(
        arena: &mut AstArena,
        ts_node: TsNode,
        source_bytes: &[u8],
        file_path: &str,
        parent: Option<NodeId>,
        current_scope: usize,
    ) -> NodeId {
        let kind = ts_node.kind().to_string();
        let is_named = ts_node.is_named();
        let span = Self::convert_span(ts_node, file_path);

        let text = if ts_node.end_byte() <= source_bytes.len() && ts_node.start_byte() <= ts_node.end_byte() {
            String::from_utf8_lossy(&source_bytes[ts_node.start_byte()..ts_node.end_byte()]).to_string()
        } else {
            String::new()
        };

        // Determine if this AST node establishes a new lexical scope
        let node_scope = if Self::is_scope_creator(&kind) {
            arena.create_scope(Some(current_scope))
        } else {
            current_scope
        };

        let node_id = arena.alloc(kind.clone(), is_named, span, text.clone(), parent, node_scope);

        // Register declared bindings in current scope
        if Self::is_binding_declaration(&kind) {
            arena.add_binding(node_scope, text);
        }

        // Recursively allocate children
        let mut cursor = ts_node.walk();
        for child in ts_node.children(&mut cursor) {
            Self::build_arena_recursive(
                arena,
                child,
                source_bytes,
                file_path,
                Some(node_id),
                node_scope,
            );
        }

        node_id
    }

    fn convert_span(ts_node: TsNode, file_path: &str) -> SourceSpan {
        let start: Point = ts_node.start_position();
        let end: Point = ts_node.end_position();

        SourceSpan {
            file_path: file_path.to_string(),
            start_byte: ts_node.start_byte(),
            end_byte: ts_node.end_byte(),
            start_line: start.row + 1,
            start_col: start.column + 1,
            end_line: end.row + 1,
            end_col: end.column + 1,
        }
    }

    fn is_scope_creator(kind: &str) -> bool {
        matches!(
            kind,
            "function_declaration"
                | "function_expression"
                | "arrow_function"
                | "method_definition"
                | "class_declaration"
                | "class_definition"
                | "function_item"
                | "block"
                | "statement_block"
                | "compound_statement"
                | "function_definition"
        )
    }

    fn is_binding_declaration(kind: &str) -> bool {
        matches!(
            kind,
            "identifier"
                | "variable_declarator"
                | "parameter"
                | "formal_parameters"
                | "required_parameter"
                | "optional_parameter"
        )
    }
}
