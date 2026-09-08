package config

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/spf13/viper"
)

const (
	// DefaultConfigDir is the hidden directory under user's home where Sentinel persists local config.
	DefaultConfigDir = ".sentinel"
	// DefaultConfigFile is the default config filename.
	DefaultConfigFile = "config.yaml"
	// DefaultAPIURL points to the Next.js Sentinel Cloud API endpoint.
	DefaultAPIURL = "http://localhost:3000/api/scan"

	// Config keys
	KeyAPIKey = "api_key"
	KeyAPIURL = "api_url"
	KeyOrgID  = "organization_id"
)

// Manager encapsulates Viper-backed configuration lifecycle.
type Manager struct {
	v          *viper.Viper
	configPath string
}

// NewManager creates a new configuration manager instance.
func NewManager() *Manager {
	v := viper.New()
	v.SetEnvPrefix("SENTINEL")
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_", "-", "_"))
	v.AutomaticEnv()

	v.SetDefault(KeyAPIURL, DefaultAPIURL)

	return &Manager{v: v}
}

// Init loads configuration from the specified file or the default user config directory.
func (m *Manager) Init(cfgFile string) error {
	if cfgFile != "" {
		m.v.SetConfigFile(cfgFile)
		m.configPath = cfgFile
	} else {
		home, err := os.UserHomeDir()
		if err != nil {
			return fmt.Errorf("failed to resolve user home directory: %w", err)
		}

		configDir := filepath.Join(home, DefaultConfigDir)
		m.configPath = filepath.Join(configDir, DefaultConfigFile)

		m.v.AddConfigPath(configDir)
		m.v.SetConfigName("config")
		m.v.SetConfigType("yaml")
	}

	if err := m.v.ReadInConfig(); err != nil {
		// If file doesn't exist yet, that is acceptable during initial setup
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok && !os.IsNotExist(err) {
			return fmt.Errorf("failed to read config file: %w", err)
		}
	}

	return nil
}

// GetAPIKey retrieves the stored API key from config or SENTINEL_API_KEY environment variable.
func (m *Manager) GetAPIKey() string {
	return strings.TrimSpace(m.v.GetString(KeyAPIKey))
}

// SetAPIKey sets the API key in viper state.
func (m *Manager) SetAPIKey(apiKey string) {
	m.v.Set(KeyAPIKey, strings.TrimSpace(apiKey))
}

// GetAPIURL retrieves the Sentinel Cloud endpoint URL.
func (m *Manager) GetAPIURL() string {
	url := strings.TrimSpace(m.v.GetString(KeyAPIURL))
	if url == "" {
		return DefaultAPIURL
	}
	return url
}

// SetAPIURL sets custom Sentinel Cloud API endpoint URL.
func (m *Manager) SetAPIURL(apiURL string) {
	m.v.Set(KeyAPIURL, strings.TrimSpace(apiURL))
}

// Save persists the current Viper configuration to disk securely.
func (m *Manager) Save() error {
	if m.configPath == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			return fmt.Errorf("failed to resolve user home directory: %w", err)
		}
		m.configPath = filepath.Join(home, DefaultConfigDir, DefaultConfigFile)
	}

	dir := filepath.Dir(m.configPath)
	if err := os.MkdirAll(dir, 0700); err != nil {
		return fmt.Errorf("failed to create config directory '%s': %w", dir, err)
	}

	// Write or overwrite configuration file
	m.v.SetConfigFile(m.configPath)
	m.v.SetConfigType("yaml")

	if err := m.v.WriteConfig(); err != nil {
		// If config file did not exist before, WriteConfig() may fail; fallback to SafeWriteConfig
		if err := m.v.SafeWriteConfig(); err != nil {
			// If SafeWriteConfig also reports existing file, force overwrite
			if err := m.v.WriteConfigAs(m.configPath); err != nil {
				return fmt.Errorf("failed to persist configuration to '%s': %w", m.configPath, err)
			}
		}
	}

	// Ensure strict file permissions for credential security
	_ = os.Chmod(m.configPath, 0600)

	return nil
}

// ConfigPath returns the current active configuration file path.
func (m *Manager) ConfigPath() string {
	return m.configPath
}
