package analyzer

import (
	"os"
	"path/filepath"
	"sort"
	"testing"
)

func TestCollectFiles_StrictFiltering(t *testing.T) {
	tempDir := t.TempDir()

	// Valid source files across accepted languages (.js, .ts, .jsx, .tsx, .py, .go)
	validFiles := []string{
		"index.js",
		"service.ts",
		"Button.jsx",
		"Header.tsx",
		"server.py",
		"main.go",
	}
	for _, f := range validFiles {
		p := filepath.Join(tempDir, f)
		_ = os.WriteFile(p, []byte("// test"), 0644)
	}

	// Ignored extension files (.min.js, .bundle.js, .map, .lock, .json, .svg, .png, .jpg, .md)
	ignoredExtFiles := []string{
		"app.min.js",
		"vendor.bundle.js",
		"bundle.js",
		"min.js",
		"app.js.map",
		"yarn.lock",
		"package.json",
		"logo.svg",
		"hero.png",
		"photo.jpg",
		"README.md",
		"styles.css",
		"document.pdf",
	}
	for _, f := range ignoredExtFiles {
		p := filepath.Join(tempDir, f)
		_ = os.WriteFile(p, []byte("ignored"), 0644)
	}

	// Ignored directories: node_modules, .git, dist, build, .next, coverage, vendor, out, .turbo
	ignoredDirs := []string{
		"node_modules",
		".git",
		"dist",
		"build",
		".next",
		"coverage",
		"vendor",
		"out",
		".turbo",
	}
	for _, d := range ignoredDirs {
		dirPath := filepath.Join(tempDir, d)
		_ = os.MkdirAll(dirPath, 0755)
		_ = os.WriteFile(filepath.Join(dirPath, "valid_name_in_ignored_dir.js"), []byte("// test"), 0644)
	}

	// Run CollectFiles
	collected, err := CollectFiles(tempDir)
	if err != nil {
		t.Fatalf("CollectFiles returned error: %v", err)
	}

	// Verify count matches only the 6 valid files
	if len(collected) != len(validFiles) {
		var rels []string
		for _, c := range collected {
			r, _ := filepath.Rel(tempDir, c)
			rels = append(rels, r)
		}
		t.Fatalf("expected %d valid files, got %d: %v", len(validFiles), len(collected), rels)
	}

	// Check basenames
	var collectedBases []string
	for _, c := range collected {
		collectedBases = append(collectedBases, filepath.Base(c))
	}
	sort.Strings(collectedBases)
	sort.Strings(validFiles)

	for i := range validFiles {
		if collectedBases[i] != validFiles[i] {
			t.Errorf("expected file %s at index %d, got %s", validFiles[i], i, collectedBases[i])
		}
	}
}

func TestIsIgnoredDir(t *testing.T) {
	tests := []struct {
		dir      string
		expected bool
	}{
		{"node_modules", true},
		{".git", true},
		{"dist", true},
		{"build", true},
		{".next", true},
		{"coverage", true},
		{"vendor", true},
		{"out", true},
		{".turbo", true},
		{".hidden", true},
		{"src", false},
		{"cmd", false},
		{"internal", false},
		{"pkg", false},
	}

	for _, tt := range tests {
		got := IsIgnoredDir(tt.dir)
		if got != tt.expected {
			t.Errorf("IsIgnoredDir(%q) = %v, expected %v", tt.dir, got, tt.expected)
		}
	}
}

func TestIsValidSourceFile(t *testing.T) {
	tests := []struct {
		file     string
		expected bool
	}{
		{"app.js", true},
		{"app.ts", true},
		{"app.jsx", true},
		{"app.tsx", true},
		{"app.py", true},
		{"app.go", true},
		{"app.min.js", false},
		{"app.bundle.js", false},
		{"bundle.js", false},
		{"app.map", false},
		{"package-lock.json", false},
		{"yarn.lock", false},
		{"icon.svg", false},
		{"img.png", false},
		{"img.jpg", false},
		{"README.md", false},
		{"app.css", false},
		{"main.rs", false},
	}

	for _, tt := range tests {
		got := IsValidSourceFile(tt.file)
		if got != tt.expected {
			t.Errorf("IsValidSourceFile(%q) = %v, expected %v", tt.file, got, tt.expected)
		}
	}
}
