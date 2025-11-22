# WhatsApp Templates (Reference Only)

This directory contains WhatsApp template files for **reference purposes only**.

## Important Notes

- **These templates are NOT used for rendering** - WhatsApp notifications use pre-approved template names from WhatsApp Business API
- **Template names must be pre-approved** by WhatsApp before they can be used
- **Template names in manifests** (`whatsappTemplateName` field) must match exactly what is approved in your WhatsApp Business account
- **Variable order matters** - Template parameters are extracted from event data based on the order defined in `requiredVariables` in the manifest

## Directory Structure

```
whatsapp-templates/
├── en/          # English templates
│   ├── auth/
│   │   ├── otp.txt
│   │   └── ...
│   └── ...
└── ar/          # Arabic templates
    ├── auth/
    │   ├── otp.txt
    │   └── ...
    └── ...
```

## How It Works

1. **Manifest Configuration**: Each WhatsApp channel in a manifest must specify `whatsappTemplateName` (e.g., `'otp_verification'`)
2. **Template Parameters**: Variables are extracted from event data based on `requiredVariables` in the manifest
3. **API Call**: The system sends template messages to WhatsApp Business API with:
   - Template name (from manifest)
   - Language code (from recipient locale)
   - Template parameters (extracted from event data)

## Template Approval Process

Before using a WhatsApp template:

1. Create the template in your WhatsApp Business account
2. Submit for approval to WhatsApp
3. Wait for approval (can take several days)
4. Once approved, use the exact template name in your manifest's `whatsappTemplateName` field

## Example Manifest

```typescript
[NotificationChannel.WHATSAPP]: {
  whatsappTemplateName: 'otp_verification',  // Must match approved template name
  requiredVariables: ['otpCode', 'expiresIn'], // Variables in order
}
```

## Template Files

These `.txt` files are kept here for reference to understand:
- What variables are used in each template
- The structure and format of messages
- Translation reference for different locales

They are **not loaded or rendered** by the notification system.

