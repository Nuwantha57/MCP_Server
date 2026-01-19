# Testing UK Holidays Update in Claude Desktop

## Prerequisites
1. Restart Claude Desktop to load the updated bridge.js
2. Ensure AWS credentials are set in environment variables

---

## Test 1: Replace UK Holidays (Single Period)

**Prompt in Claude Desktop:**
```
Update UK holidays with this data:
- Christmas 2026: December 24-28, 2026
- Timezone: +00:00 (UTC)
- Mode: Replace all existing holidays
```

**Or more conversational:**
```
Replace UK holidays with Christmas 2026 from December 24 to 28 in UTC timezone
```

**Expected Response:**
```
✅ Holiday dates successfully updated for UK
Replaced 1 holiday period(s) for UK
Status: Applied
Note: Changes may take a few seconds to propagate
```

**Verify it worked:**
```
Find a meeting time on December 25, 2026 between UK and US at 9 AM
```

Expected: Should show UK on holiday ⚠️

---

## Test 2: Append Additional UK Holiday (Multiple Periods)

**Prompt in Claude Desktop:**
```
Add Easter 2026 holidays to UK (April 3-6, 2026) without removing Christmas. 
Use timezone +00:00 and append mode.
```

**Or:**
```
Append UK holidays:
- Easter 2026: April 3-6, 2026 
- Timezone: +00:00
- Keep existing Christmas holidays
```

**Expected Response:**
```
✅ Holiday dates successfully updated for UK
Added 2 holiday period(s) for UK
Status: Applied
```

**Verify it worked:**
```
Find a meeting time on April 4, 2026 between UK and US at 10 AM
```

Expected: Should show UK on holiday ⚠️ (Easter)

```
Find a meeting time on December 25, 2026 between UK and US at 10 AM
```

Expected: Should STILL show UK on holiday ⚠️ (Christmas still there)

---

## Test 3: Update Using Your Example Format

**Prompt (matching your exact format):**
```
Update UK holidays with multiple periods:

Period 1 (Christmas):
- Start: 2026-12-24, End: 2026-12-28, Timezone: +00:00

Period 2 (New Year):
- Start: 2027-01-01, End: 2027-01-02, Timezone: +00:00

Use replace mode
```

**Claude will interpret this and call the tool with:**
```json
{
  "country": "UK",
  "holidays": [
    {
      "startDate": "2026-12-24",
      "endDate": "2026-12-28",
      "timezone": "+00:00"
    },
    {
      "startDate": "2027-01-01",
      "endDate": "2027-01-02",
      "timezone": "+00:00"
    }
  ],
  "mode": "replace"
}
```

**Expected Response:**
```
✅ Holiday dates successfully updated for UK
Replaced 2 holiday period(s) for UK
```

---

## Test 4: Verify All Countries Work

**Test US:**
```
Update US holidays to December 20-28, 2026 with timezone -05:00
```

**Test AU:**
```
Update Australia holidays to December 24-28, 2026 with timezone +11:00
```

**Test NZ:**
```
Update New Zealand holidays to December 24-28, 2026 with timezone +13:00
```

---

## Understanding Mode Parameter

### Replace Mode (Default)
- **Removes ALL existing holidays** for that country
- **Replaces with new holidays**
- Use when: Resetting holidays for a new year

**Example:**
```
Replace UK holidays with just Christmas 2026 (Dec 24-28)
```

### Append Mode
- **Keeps existing holidays**
- **Adds new holidays** to the list
- Use when: Adding additional holiday periods

**Example:**
```
Add Easter to UK holidays (keep existing Christmas dates)
```

---

## Troubleshooting

**If update shows "Tool execution failed":**
1. Check Claude Desktop logs: `%APPDATA%\Claude\logs`
2. Look for `[BRIDGE]` entries
3. Verify AWS credentials are set: `$env:AWS_ACCESS_KEY_ID`

**If holidays don't take effect:**
1. Wait 5-10 seconds for Lambda to propagate changes
2. Try the meeting time query again
3. Check Lambda environment variables in AWS Console

**To verify current holidays:**
```
Find a meeting time on [specific holiday date] between UK and US
```

If it shows "on holiday" ⚠️, the update worked!

---

## Claude Interpretation Examples

Claude is smart and can understand natural language. All of these work:

✅ "Update UK holidays to December 24-28, 2026"
✅ "Set UK Christmas holidays from Dec 24 to Dec 28 in UTC"
✅ "Replace UK holidays with Christmas 2026: 24-28 Dec, timezone +00:00"
✅ "Add Easter (April 3-6) to UK holidays without removing Christmas"
✅ "Append UK Easter 2026 from April 3 to 6"

Claude will automatically:
- Parse date ranges
- Determine if it should replace or append based on your wording
- Convert timezone formats
- Format the JSON correctly for the tool

---

## Example Full Conversation

**You:** "Replace UK holidays with Christmas 2026 from December 24 to 28 in UTC"

**Claude:** "I'll update the UK holidays for Christmas 2026."
[Calls updateCountryHolidays tool]
"✅ Holiday dates successfully updated for UK. The holidays have been set for December 24-28, 2026."

**You:** "Now add Easter 2026 from April 3 to 6 without removing Christmas"

**Claude:** "I'll add Easter holidays while keeping the existing Christmas dates."
[Calls updateCountryHolidays with mode='append']
"✅ Successfully added Easter holidays. UK now has 2 holiday periods configured."

**You:** "Test if December 25 is a holiday for UK"

**Claude:** [Calls getMeetingTime]
"Yes, December 25, 2026 is a UK holiday (Christmas period)."
