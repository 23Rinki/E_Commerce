# 📊 Browsing History Logging Guide

## 📍 Log Files Location

All logs are stored in the **`Logs/`** folder in your application root directory:

```
RNVS.ECommerce.Solution/
└── RNVS.ECommerce.Web/
    └── Logs/
        ├── ecommerce-2025-10-31.log          ← General application logs
        ├── browsing-history-2025-10-31.log   ← Browsing history specific logs
        ├── ecommerce-2025-10-30.log
        ├── browsing-history-2025-10-30.log
        └── ... (30 days retained)
```

### 🔄 Log Rotation
- **New file created daily** at midnight
- **Format**: `browsing-history-YYYY-MM-DD.log`
- **Retention**: Last 30 days automatically kept
- **Old logs automatically deleted** after 30 days

---

## 📋 Log File Types

### 1. **ecommerce-{date}.log**
General application logs including:
- Application startup/shutdown
- Errors and warnings
- All system events

### 2. **browsing-history-{date}.log** ⭐ (Main Browsing History Log)
Dedicated log for product view tracking with detailed user information.

---

## 📝 Browsing History Log Format

### Example Log Entry:
```
2025-10-31 14:23:45.123 | User: john@email.com | Action: PRODUCT_VIEW | ProductId: 123 | IP: 192.168.1.1 | Session: abc-123-def | PRODUCT_VIEW | User: john@email.com | Product: 123 (iPhone 15 Pro) | Session: abc-123-def | IP: 192.168.1.1 | Referrer: Google Search | DateTime: 2025-10-31 14:23:45
```

### Log Fields Explained:

| Field | Description | Example |
|-------|-------------|---------|
| **Timestamp** | Date & time with milliseconds | `2025-10-31 14:23:45.123` |
| **User** | Username or "Guest" | `john@email.com` or `Guest` |
| **Action** | Type of action | `PRODUCT_VIEW`, `BROWSING_HISTORY_REQUESTED`, `RECENT_VIEWS_REQUESTED` |
| **ProductId** | Product being viewed | `123` |
| **ProductName** | Product name | `iPhone 15 Pro` |
| **Session** | Unique session identifier | `abc-123-def-456` |
| **IP Address** | User's IP address | `192.168.1.1` |
| **Referrer** | Where user came from | `Google Search`, `Facebook`, `Direct` |

---

## 🔍 How to Check Logs

### **Option 1: Open with Text Editor**
```bash
# Windows
notepad Logs\browsing-history-2025-10-31.log

# Or any text editor
code Logs\browsing-history-2025-10-31.log
```

### **Option 2: PowerShell (Windows)**
```powershell
# View last 50 lines
Get-Content Logs\browsing-history-2025-10-31.log -Tail 50

# View live (real-time)
Get-Content Logs\browsing-history-2025-10-31.log -Wait -Tail 10

# Search for specific user
Get-Content Logs\browsing-history-2025-10-31.log | Select-String "john@email.com"

# Search for specific product
Get-Content Logs\browsing-history-2025-10-31.log | Select-String "ProductId: 123"

# Count total views today
(Get-Content Logs\browsing-history-2025-10-31.log | Select-String "PRODUCT_VIEW").Count
```

### **Option 3: Command Prompt (Windows)**
```cmd
# View entire file
type Logs\browsing-history-2025-10-31.log

# View last lines
powershell Get-Content Logs\browsing-history-2025-10-31.log -Tail 20
```

### **Option 4: Linux/Mac**
```bash
# View last 50 lines
tail -n 50 Logs/browsing-history-2025-10-31.log

# View live (real-time)
tail -f Logs/browsing-history-2025-10-31.log

# Search for user
grep "john@email.com" Logs/browsing-history-2025-10-31.log

# Count total views
grep -c "PRODUCT_VIEW" Logs/browsing-history-2025-10-31.log
```

---

## 📊 Common Search Queries

### Find all views by a specific user:
```powershell
Get-Content Logs\browsing-history-2025-10-31.log | Select-String "User: john@email.com"
```

### Find all views for a specific product:
```powershell
Get-Content Logs\browsing-history-2025-10-31.log | Select-String "ProductId: 123"
```

### Find all guest user views:
```powershell
Get-Content Logs\browsing-history-2025-10-31.log | Select-String "User: Guest"
```

### Find views from specific IP:
```powershell
Get-Content Logs\browsing-history-2025-10-31.log | Select-String "IP: 192.168.1.1"
```

### Get hourly view count:
```powershell
(Get-Content Logs\browsing-history-2025-10-31.log | Select-String "2025-10-31 14:").Count
```

---

## 🔐 Security & Privacy

### ⚠️ IMPORTANT:
- **Logs contain sensitive information** (usernames, IP addresses)
- **DO NOT commit logs to Git** (already in .gitignore)
- **DO NOT share logs publicly**
- **Consider GDPR/privacy regulations** in your region
- **Encrypt logs** in production environments

### Recommended Security Practices:
1. ✅ Restrict folder permissions (only admin access)
2. ✅ Regularly archive old logs to secure storage
3. ✅ Use log analysis tools with proper authentication
4. ✅ Implement log retention policies per regulations

---

## 🚀 Production Deployment (Railway)

### Railway Setup:
When deployed to Railway, logs will be stored in:
```
/app/Logs/browsing-history-YYYY-MM-DD.log
```

### Viewing Logs on Railway:
```bash
# SSH into Railway container
railway shell

# View logs
tail -f /app/Logs/browsing-history-$(date +%Y-%m-%d).log

# Or use Railway CLI
railway logs
```

### Persistent Storage on Railway:
**⚠️ IMPORTANT**: Railway containers are ephemeral. To persist logs:

1. **Option 1: Use Railway Volumes**
   ```bash
   railway volume create --name logs-volume
   ```

2. **Option 2: Use External Logging Service**
   - Seq (https://datalust.co/seq)
   - Logtail (https://logtail.com/)
   - Papertrail (https://www.papertrail.com/)

3. **Option 3: Store in Database**
   - Create a `Logs` table
   - Store critical logs in PostgreSQL

---

## 📈 Log Analytics Tools

### Free Tools:
1. **Notepad++** - Simple viewing
2. **VS Code** - With log viewer extensions
3. **Excel** - Import CSV format
4. **PowerShell** - Built-in analysis

### Professional Tools:
1. **Seq** - Structured logging ($0-$495/year)
2. **Loggly** - Cloud logging (Free tier available)
3. **Splunk** - Enterprise logging
4. **Elasticsearch + Kibana** - Open source

---

## 🎯 Use Cases

### 1. **Track Popular Products**
See which products get the most views:
```powershell
Get-Content Logs\browsing-history-*.log | Select-String "PRODUCT_VIEW" |
    Group-Object {($_ -split "ProductId: ")[1].Split(" ")[0]} |
    Sort-Object Count -Descending |
    Select-Object -First 10
```

### 2. **Monitor User Activity**
Track a specific user's browsing pattern:
```powershell
Get-Content Logs\browsing-history-*.log | Select-String "User: john@email.com"
```

### 3. **Detect Suspicious Activity**
Find unusual IP addresses or excessive requests:
```powershell
Get-Content Logs\browsing-history-2025-10-31.log |
    Select-String "IP: " |
    Group-Object {($_ -split "IP: ")[1].Split(" ")[0]} |
    Where-Object {$_.Count -gt 100}
```

### 4. **Track Referral Sources**
See where users are coming from:
```powershell
Get-Content Logs\browsing-history-*.log | Select-String "Referrer:" |
    Group-Object {($_ -split "Referrer: ")[1].Split(" ")[0]}
```

---

## 🐛 Troubleshooting

### Logs not being created?
1. Check folder permissions
2. Ensure application has write access
3. Check Serilog configuration in `Program.cs`

### Logs too large?
1. Reduce retention days (currently 30)
2. Archive old logs
3. Use log levels appropriately

### Can't find today's log?
File name format: `browsing-history-YYYY-MM-DD.log`
Example: `browsing-history-2025-10-31.log`

---

## 📞 Support

For issues or questions:
- Check application logs in `ecommerce-{date}.log`
- Review error messages
- Contact development team

---

**Last Updated**: October 31, 2025
**Version**: 1.0.0
