use std::path::Path;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum SupportedLanguage {
    JavaScript,
    TypeScript,
    Python,
    Go,
    Unknown,
}

impl SupportedLanguage {
    pub fn from_path<P: AsRef<Path>>(path: P) -> Self {
        let path = path.as_ref();
        if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
            match ext.to_lowercase().as_str() {
                "js" | "jsx" | "mjs" | "cjs" => SupportedLanguage::JavaScript,
                "ts" | "tsx" | "mts" | "cts" => SupportedLanguage::TypeScript,
                "py" | "pyw" => SupportedLanguage::Python,
                "go" => SupportedLanguage::Go,
                _ => SupportedLanguage::Unknown,
            }
        } else {
            SupportedLanguage::Unknown
        }
    }

    pub fn name(&self) -> &'static str {
        match self {
            SupportedLanguage::JavaScript => "javascript",
            SupportedLanguage::TypeScript => "typescript",
            SupportedLanguage::Python => "python",
            SupportedLanguage::Go => "go",
            SupportedLanguage::Unknown => "unknown",
        }
    }

    pub fn tree_sitter_language(&self) -> Option<tree_sitter::Language> {
        match self {
            SupportedLanguage::JavaScript => Some(tree_sitter_javascript::language()),
            SupportedLanguage::TypeScript => Some(tree_sitter_typescript::language_typescript()),
            SupportedLanguage::Python => Some(tree_sitter_python::language()),
            SupportedLanguage::Go => Some(tree_sitter_go::language()),
            SupportedLanguage::Unknown => None,
        }
    }
}
