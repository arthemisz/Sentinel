package analyzer

import (
	"os"
	"path/filepath"
	"strings"
)

// IgnoredDirectories defines vendor bloat, version control, build output, and cache directories to skip.
var IgnoredDirectories = map[string]bool{
	"node_modules": true,
	".git":         true,
	"dist":         true,
	"build":        true,
	".next":        true,
	"coverage":     true,
	"vendor":       true,
	"out":          true,
	".turbo":       true,
}

// IgnoredExtensions defines minified files, lockfiles, data, and asset extensions to skip.
var IgnoredExtensions = []string{
	".min.js",
	".bundle.js",
	".map",
	".lock",
	".json",
	".svg",
	".png",
	".jpg",
	".md",
}

// ValidSourceExtensions defines source code extensions accepted for AST traversal.
var ValidSourceExtensions = map[string]bool{
	".js":  true,
	".ts":  true,
	".jsx": true,
	".tsx": true,
	".py":  true,
	".go":  true,
}

// IsIgnoredDir checks if a directory matches ignored directory patterns.
func IsIgnoredDir(name string) bool {
	lower := strings.ToLower(name)
	if IgnoredDirectories[lower] {
		return true
	}
	if strings.HasPrefix(name, ".") && name != "." {
		return true
	}
	return false
}

// IsIgnoredExtension checks if a filename or path matches ignored extensions or suffixes.
func IsIgnoredExtension(path string) bool {
	lower := strings.ToLower(filepath.Base(path))
	if lower == "bundle.js" || lower == "min.js" {
		return true
	}
	for _, ign := range IgnoredExtensions {
		if strings.HasSuffix(lower, ign) {
			return true
		}
	}
	return false
}

// IsValidSourceFile checks if the given file path is a scannable source code file.
func IsValidSourceFile(path string) bool {
	if IsIgnoredExtension(path) {
		return false
	}
	ext := strings.ToLower(filepath.Ext(path))
	return ValidSourceExtensions[ext]
}

// CollectFiles traverses root and discovers valid source code files, strictly ignoring
// build directories, vendor bloat, and non-source assets.
func CollectFiles(root string) ([]string, error) {
	var files []string

	err := filepath.WalkDir(root, func(path string, d os.DirEntry, walkErr error) error {
		if walkErr != nil {
			return nil
		}

		name := d.Name()
		if d.IsDir() {
			if IsIgnoredDir(name) {
				return filepath.SkipDir
			}
			return nil
		}

		if IsValidSourceFile(path) {
			files = append(files, path)
		}

		return nil
	})

	return files, err
}
