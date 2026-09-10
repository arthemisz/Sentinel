use crate::ast::language::SupportedLanguage;
use crate::engine::SentinelEngine;
use std::ffi::{CStr, CString};
use std::os::raw::c_char;

#[unsafe(no_mangle)]
pub extern "C" fn sentinel_engine_init() -> i32 {
    0
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn sentinel_analyze_path(
    path_ptr: *const c_char,
    repo_url_ptr: *const c_char,
) -> *mut c_char {
    if path_ptr.is_null() {
        return std::ptr::null_mut();
    }

    let path_str = match unsafe { CStr::from_ptr(path_ptr) }.to_str() {
        Ok(s) => s,
        Err(_) => return std::ptr::null_mut(),
    };

    let repo_url = if repo_url_ptr.is_null() {
        "local://repository"
    } else {
        match unsafe { CStr::from_ptr(repo_url_ptr) }.to_str() {
            Ok(s) => s,
            Err(_) => "local://repository",
        }
    };

    let engine = SentinelEngine::new(repo_url, "HEAD");
    match engine.analyze_path(path_str) {
        Ok(report) => match serde_json::to_string(&report) {
            Ok(json_str) => match CString::new(json_str) {
                Ok(c_string) => c_string.into_raw(),
                Err(_) => std::ptr::null_mut(),
            },
            Err(_) => std::ptr::null_mut(),
        },
        Err(e) => {
            let err_json = format!(r#"{{"error": "{}"}}"#, e);
            CString::new(err_json).map(|c| c.into_raw()).unwrap_or(std::ptr::null_mut())
        }
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn sentinel_analyze_source(
    source_ptr: *const c_char,
    filename_ptr: *const c_char,
    lang_ptr: *const c_char,
) -> *mut c_char {
    if source_ptr.is_null() || filename_ptr.is_null() {
        return std::ptr::null_mut();
    }

    let source = match unsafe { CStr::from_ptr(source_ptr) }.to_str() {
        Ok(s) => s,
        Err(_) => return std::ptr::null_mut(),
    };

    let filename = match unsafe { CStr::from_ptr(filename_ptr) }.to_str() {
        Ok(s) => s,
        Err(_) => return std::ptr::null_mut(),
    };

    let lang = if !lang_ptr.is_null() {
        let lang_str = unsafe { CStr::from_ptr(lang_ptr) }.to_str().unwrap_or("unknown");
        match lang_str.to_lowercase().as_str() {
            "js" | "javascript" => SupportedLanguage::JavaScript,
            "ts" | "typescript" => SupportedLanguage::TypeScript,
            "py" | "python" => SupportedLanguage::Python,
            "go" => SupportedLanguage::Go,
            _ => SupportedLanguage::from_path(filename),
        }
    } else {
        SupportedLanguage::from_path(filename)
    };

    let engine = SentinelEngine::default();
    match engine.analyze_source(source, filename, lang) {
        Ok(report) => match serde_json::to_string(&report) {
            Ok(json_str) => match CString::new(json_str) {
                Ok(c_string) => c_string.into_raw(),
                Err(_) => std::ptr::null_mut(),
            },
            Err(_) => std::ptr::null_mut(),
        },
        Err(e) => {
            let err_json = format!(r#"{{"error": "{}"}}"#, e);
            CString::new(err_json).map(|c| c.into_raw()).unwrap_or(std::ptr::null_mut())
        }
    }
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn sentinel_free_string(ptr: *mut c_char) {
    if !ptr.is_null() {
        drop(unsafe { CString::from_raw(ptr) });
    }
}
