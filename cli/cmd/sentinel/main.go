package main

import (
	"fmt"
	"os"

	"github.com/sentinel-sast/sentinel/cli/cmd"
)

func main() {
	if err := cmd.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "\n[ERROR] %v\n", err)
		os.Exit(1)
	}
}
