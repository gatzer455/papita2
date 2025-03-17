// Define necessary types
#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct ApiResponse {
    pub generated_code: String,
    pub error: Option<String>,
}

impl Default for ApiResponse {
    fn default() -> Self {
        Self {
            generated_code: String::new(),
            error: None,
        }
    }
}