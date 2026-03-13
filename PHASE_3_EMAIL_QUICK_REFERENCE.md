# Phase 3 Email Components - Quick Reference Guide

## 🚀 Quick Start

### Import All Components
```typescript
import { 
  VariableForm, 
  TemplatePreview, 
  TemplateTestEmail, 
  TemplateList, 
  TemplateDashboard 
} from '@/components/admin/email';
```

### Import Individual Components
```typescript
import { TemplateDashboard } from '@/components/admin/email';
```

---

## 📦 Component Cheat Sheet

### 1. VariableForm
Dynamic form for template variables
```typescript
<VariableForm
  templateKey="welcome-email"
  requiredVars={['firstName', 'email']}
  optionalVars={['company']}
  onSubmit={handleSubmit}
  submitButtonLabel="Next Step"
  loading={isLoading}
/>
```

### 2. TemplatePreview
Shows email preview with tabs
```typescript
<TemplatePreview
  templateKey="welcome-email"
  variables={{ firstName: 'John', email: 'john@example.com' }}
/>
```

### 3. TemplateTestEmail
Complete test email workflow
```typescript
<TemplateTestEmail
  templateKey="welcome-email"
  requiredVars={['firstName']}
  optionalVars={['company']}
  onSuccess={() => console.log('email sent')}
/>
```

### 4. TemplateList
Browse and manage templates
```typescript
<TemplateList
  selectedKey={selectedKey}
  onSelectTemplate={(key) => setSelectedKey(key)}
/>
```

### 5. TemplateDashboard
Statistics and monitoring
```typescript
<TemplateDashboard />
```

---

## 🔌 API Endpoints Needed

**Must Implement** (6 endpoints):

```
GET    /api/admin/email/templates
POST   /api/admin/email/templates/[key]/preview
POST   /api/admin/email/templates/[key]/send-test
PATCH  /api/admin/email/templates/[key]/toggle
PATCH  /api/admin/email/templates/[key]/archive
GET    /api/admin/email/stats
```

---

## 🎯 Common Patterns

### Show test email form for selected template
```typescript
const [templateKey, setTemplateKey] = useState<string | null>(null);

return (
  <>
    <TemplateList onSelectTemplate={setTemplateKey} selectedKey={templateKey} />
    {templateKey && <TemplateTestEmail templateKey={templateKey} />}
  </>
);
```

### Full email management page
```typescript
export default function EmailManagement() {
  return (
    <div className="space-y-8">
      <TemplateDashboard />
      <div className="grid grid-cols-3 gap-6">
        <TemplateList onSelectTemplate={handleSelect} selectedKey={selected} />
        {selected && <TemplateTestEmail templateKey={selected} />}
      </div>
    </div>
  );
}
```

### Standalone form for email variables
```typescript
function EmailForm({ templateKey }) {
  return (
    <VariableForm
      templateKey={templateKey}
      requiredVars={['recipient', 'subject']}
      onSubmit={async (values) => {
        const response = await fetch('/api/send-email', {
          method: 'POST',
          body: JSON.stringify(values)
        });
      }}
    />
  );
}
```

---

## 🎨 Styling & Props

### VariableForm Props
| Prop | Type | Required | Description |
|------|------|:--------:|-------------|
| templateKey | string | ✅ | Email template identifier |
| requiredVars | string[] | ✅ | List of required variables |
| optionalVars | string[] | ✅ | List of optional variables |
| onSubmit | function | ✅ | Callback with form values |
| submitButtonLabel | string | ❌ | Default: "Generate Preview" |
| loading | boolean | ❌ | Show loading state |

### TemplatePreview Props
| Prop | Type | Required | Description |
|------|------|:--------:|-------------|
| templateKey | string | ✅ | Email template identifier |
| variables | object | ❌ | Variables to fill in template |

### TemplateTestEmail Props
| Prop | Type | Required | Description |
|------|------|:--------:|-------------|
| templateKey | string | ✅ | Email template identifier |
| requiredVars | string[] | ❌ | Required variables |
| optionalVars | string[] | ❌ | Optional variables |
| onSuccess | function | ❌ | Callback when email sent |

### TemplateList Props
| Prop | Type | Required | Description |
|------|------|:--------:|-------------|
| onSelectTemplate | function | ❌ | Callback with selected key |
| selectedKey | string | ❌ | Currently selected template |

### TemplateDashboard Props
| Prop | Type | Required | Description |
|------|------|:--------:|-------------|
| (none) | - | - | No props required |

---

## 🔍 Field Type Detection

VariableForm auto-detects field types from variable names:

| Pattern | Type | Example |
|---------|------|---------|
| contains "email" | email | `userEmail` |
| contains "date" | date | `sentDate` |
| contains "count" or "number" | number | `itemCount` |
| contains "url" or "link" | url | `resetUrl` |
| contains "is" or "has" | boolean | `isActive` |
| default | string | `firstName` |

---

## 🎨 Color System

### Category Colors (TemplateList)
- **Password Reset**: Red 🔐
- **Welcome**: Green 👋
- **Verification**: Blue ✓
- **Notification**: Purple 🔔
- **Confirmation**: Amber ✅
- **Alert**: Orange ⚠️
- **Information**: Indigo ℹ️

### Status Colors
- **Active/Success**: Green
- **Inactive/Neutral**: Gray
- **Archived**: Faded
- **Error**: Red

---

## 📱 Responsive Breakpoints

All components are responsive:
- **Mobile**: Single column, stacked
- **Tablet** (md): 2 columns
- **Desktop** (lg): 3-4 columns

Cards and tables automatically adapt to screen size.

---

## 🐛 Debugging

### Console Logs
All components log errors to console:
```javascript
console.error('Component error:', err);
```

### Toast Notifications
Components show user-friendly toasts:
- Success: Green toast ✅
- Error: Red toast ❌
- Info: Blue toast ℹ️
- Warning: Yellow toast ⚠️

### Check Component State
```typescript
// In React DevTools:
// - Form values in VariableForm state
// - Selected template in TemplateList state
// - Sent emails in TemplateTestEmail state
```

---

## 🚦 Common Issues & Solutions

### Issue: Form not submitting
**Solution**: Check that all required fields are filled (marked with *)

### Issue: Preview not loading
**Solution**: Verify `/api/admin/email/templates/[key]/preview` endpoint exists

### Issue: Email not sending
**Solution**: Verify recipient email is valid and `/api/admin/email/templates/[key]/send-test` endpoint exists

### Issue: List showing no templates
**Solution**: Verify `/api/admin/email/templates` returns array of templates

### Issue: Toasts not showing
**Solution**: Ensure ToastProvider wraps the page. Add to layout:
```typescript
<ToastProvider>
  {children}
</ToastProvider>
```

---

## 📚 Dependencies

No new dependencies added. Uses existing:
- `react@^18.2.0`
- `framer-motion@^11.0.3`
- `tailwindcss@^3.4.1`
- `@components/admin/shared/ToastContext` (custom)

---

## 📖 File Locations

All files in: `apps/web/src/components/admin/email/`

- `VariableForm.tsx` - Form generator
- `TemplatePreview.tsx` - Preview viewer
- `TemplateTestEmail.tsx` - Test sender
- `TemplateList.tsx` - Template browser
- `TemplateDashboard.tsx` - Dashboard
- `index.ts` - Barrel export

---

## ✅ Pre-Integration Checklist

- [ ] API endpoints implemented
- [ ] Email service configured
- [ ] Toast provider in layout
- [ ] Database has templates
- [ ] SMTP settings configured
- [ ] Error handling in backend
- [ ] CORS configured if needed
- [ ] Rate limiting setup
- [ ] Logging configured
- [ ] Tests written

---

## 🔗 Related Files

See also:
- `src/components/admin/shared/ToastContext.tsx` - Notification system
- `src/components/admin/shared/Toast.tsx` - Toast UI
- `src/components/admin/settings/SmtpSettingsForm.tsx` - Similar form pattern
- `package.json` - Dependencies

---

## 💡 Pro Tips

1. **Reuse VariableForm** for any form with dynamic fields
2. **Combine components** like in the examples for complex workflows
3. **Toast notifications** automatically clear after 5-6 seconds
4. **Mobile preview** great for testing responsive emails
5. **Copy buttons** support copying large HTML without manual work
6. **Selection highlighting** makes it clear which template is active
7. **Archived templates** shown separately (toggle to see them)
8. **Recent tests** stored in component state (not persisted)

---

## 📞 Support

For questions about:
- **Components**: Check inline JSDoc comments
- **API contract**: See PHASE_3_EMAIL_COMPONENTS_SUMMARY.md
- **Patterns**: Look at existing admin components in `src/components/admin/`
- **Styling**: Review TailwindCSS utilities used
- **Hooks**: React documentation for useState, useEffect, useCallback

---

**Version**: 1.0 (Phase 3)  
**Status**: ✅ Production Ready  
**Last Updated**: Phase 3 Email Management System
