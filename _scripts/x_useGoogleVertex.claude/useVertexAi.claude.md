# GCP Vertex AI with claude code

## Claude code guide using vertex ai gcp

https://code.claude.com/docs/en/google-vertex-ai#1-enable-vertex-ai-api

## gemini setup

Yes, you can use Claude Code with your $300 GCP Vertex AI credits. Claude Code runs natively on Google Cloud's Vertex AI, allowing you to use your existing GCP credits instead of a separate Anthropic subscription. [1, 2]  
Prerequisites for Using Credits

• Active Billing Account: Your GCP account must have billing enabled (using the free trial credits).
• Vertex AI API Enabled: Enable the Vertex AI API () in your GCP project.
• Model Access: You must go to the Vertex AI Model Garden and specifically enable the Claude models (e.g., Claude 3.5 Sonnet) you wish to use. [1, 3, 4, 5]

How to Configure Claude Code for Vertex AI
To route Claude Code through your GCP credits, you need to configure your environment variables:

1. Install Claude Code: .
2. Configure Environment Variables: Add the following to your or :

    •
    •
    • (or your preferred region).

3. Authenticate: Run to allow Claude Code to use your credentials.
4. Run: Type in your terminal. The tool will now consume your $300 GCP credits. [1, 7, 8, 9, 10]

Key Considerations

• Region Support: Vertex AI may not support all Claude models in all regions; you may need to specify a regional endpoint.
• Cost Monitoring: While you are using free credits, keep an eye on your usage in the Google Cloud Console to avoid unexpectedly exceeding the $300 limit.
• Model Versions: It is recommended to pin specific model versions (e.g., ) to ensure stability.
• Latest Version: Use Claude Code v2.1.98 or later for proper Vertex AI setup. [4, 11, 12, 13]

AI responses may include mistakes.

[1] https://dev.to/timtech4u/run-claude-code-on-google-cloud-use-your-gcp-credits-for-ai-coding-desktop-control-and-more-2151
[2] https://dev.to/timtech4u/run-claude-code-on-google-cloud-use-your-gcp-credits-for-ai-coding-desktop-control-and-more-2151
[3] https://docs.cloud.google.com/vertex-ai/generative-ai/docs/partner-models/claude/use-claude
[4] https://www.reddit.com/r/googlecloud/comments/1lsg8k2/psa_google_vertex_ai_free_trial_is_not_what_it/
[5] https://code.claude.com/docs/en/google-vertex-ai
[6] https://www.eesel.ai/blog/google-vertex-ai-claude-code
[7] https://medium.com/google-cloud/claude-code-on-google-vertex-ai-25e13b1b643d
[8] https://cloud.google.com/vertex-ai
[9] https://jpcaparas.medium.com/using-claude-code-with-google-vertex-ai-a-simple-robust-setup-plus-a-handy-vclaude-command-bc6987013eee
[10] https://github.com/juspay/vertex
[11] https://code.claude.com/docs/en/google-vertex-ai
[12] https://www.reddit.com/r/SillyTavernAI/comments/1roogfq/psa_you_can_no_longer_use_ai_studio_and_the/
[13] https://code.claude.com/docs/en/google-vertex-ai

## IAM check

```bash
# 3. GCP 로그 확인 (확실한 방법) -> 로그 나오면 Vertex 사용 중
gcloud logging read "aiplatform.googleapis.com" --limit=20

# 5. IAM 기반 확인
gcloud projects get-iam-policy fluid-fiber-489023-f5
```
