# Holiday Configuration Guide

## Overview
The MCP Server now supports holidays arrays as environment variables in Railway. This allows the `getMeetingTime` tool to recognize holidays and suggest alternative business days.

## Environment Variable Format

**Variable Name Format:** `HOLIDAYS_{COUNTRY_CODE}`

**Value Format:** Comma-separated dates in `YYYY-MM-DD` format

### Example Environment Variables

```
HOLIDAYS_US=2026-01-01,2026-07-04,2026-11-26,2026-12-25
HOLIDAYS_UK=2026-01-01,2026-04-10,2026-05-08,2026-12-25,2026-12-26
HOLIDAYS_INDIA=2026-01-26,2026-03-25,2026-08-15,2026-10-02,2026-11-01,2026-12-25
HOLIDAYS_JAPAN=2026-01-01,2026-02-11,2026-03-21,2026-04-29,2026-05-03,2026-05-04,2026-07-23,2026-08-10,2026-09-21,2026-10-12,2026-11-03,2026-11-23
HOLIDAYS_GERMANY=2026-01-01,2026-04-10,2026-04-13,2026-05-21,2026-05-31,2026-10-03,2026-12-25,2026-12-26
HOLIDAYS_DUBAI=2026-01-01,2026-04-10,2026-05-24,2026-06-15,2026-07-30,2026-08-15,2026-11-30,2026-12-01,2026-12-02,2026-12-03
HOLIDAYS_SINGAPORE=2026-01-01,2026-02-17,2026-04-10,2026-05-01,2026-05-24,2026-08-09,2026-10-29,2026-12-25
HOLIDAYS_AUSTRALIA=2026-01-01,2026-01-26,2026-04-10,2026-04-13,2026-04-25,2026-06-08,2026-12-25,2026-12-26
HOLIDAYS_BRAZIL=2026-01-01,2026-02-16,2026-02-17,2026-04-10,2026-04-21,2026-05-01,2026-09-07,2026-10-12,2026-11-02,2026-11-15,2026-11-20,2026-12-25
HOLIDAYS_FRANCE=2026-01-01,2026-04-13,2026-05-01,2026-05-08,2026-05-21,2026-07-14,2026-08-15,2026-11-01,2026-11-11,2026-12-25
HOLIDAYS_CHINA=2026-01-01,2026-02-17,2026-02-18,2026-02-19,2026-02-20,2026-02-21,2026-04-05,2026-06-10,2026-09-15,2026-09-16,2026-09-17,2026-10-01,2026-10-02,2026-10-03,2026-10-05,2026-10-06,2026-10-07
```

## How to Set Environment Variables in Railway

### Option 1: Railway Dashboard (Recommended)
1. Go to [Railway Dashboard](https://railway.app)
2. Select your project: **MCP.Server**
3. Click on the service
4. Go to **Variables** tab
5. Click **+ Add Variable**
6. For each country, add:
   - **Key:** `HOLIDAYS_US` (or other country code)
   - **Value:** `2026-01-01,2026-07-04,2026-11-26,2026-12-25`
7. Repeat for each country
8. Click **Deploy** to apply changes

### Option 2: Using Railway CLI
```powershell
railway variable set HOLIDAYS_US "2026-01-01,2026-07-04,2026-11-26,2026-12-25"
railway variable set HOLIDAYS_UK "2026-01-01,2026-04-10,2026-05-08,2026-12-25,2026-12-26"
railway variable set HOLIDAYS_INDIA "2026-01-26,2026-03-25,2026-08-15,2026-10-02,2026-11-01,2026-12-25"
```

### Option 3: Using a .env File
Create a `.railway.env` file in your project root:
```env
HOLIDAYS_US=2026-01-01,2026-07-04,2026-11-26,2026-12-25
HOLIDAYS_UK=2026-01-01,2026-04-10,2026-05-08,2026-12-25,2026-12-26
HOLIDAYS_INDIA=2026-01-26,2026-03-25,2026-08-15,2026-10-02,2026-11-01,2026-12-25
```

Then deploy:
```powershell
railway up
```

## Testing with Postman

### Without Holidays
**Request:**
```json
{
  "country1": "US",
  "country2": "India",
  "preferredTime": "14:00"
}
```

**Response (sample):**
```json
{
  "country1": "US",
  "country2": "India",
  "timezone1": "America/New_York",
  "timezone2": "Asia/Kolkata",
  "time1": "14:00:00",
  "time2": "00:30:00",
  "date1": "2026-01-08 (Thu)",
  "date2": "2026-01-08 (Thu)",
  "isHoliday1": false,
  "isHoliday2": false,
  "holidayStatus": "",
  "nextBusinessDay1": "2026-01-08 (Thu)",
  "nextBusinessDay2": "2026-01-08 (Thu)",
  "message": "When it's 14:00 in US, it's 00:30 in India"
}
```

### With Holidays (Jan 1 - New Year)
**Request:**
```json
{
  "country1": "US",
  "country2": "UK",
  "preferredTime": "10:00"
}
```

**Response (if Jan 1, 2026):**
```json
{
  "country1": "US",
  "country2": "UK",
  "isHoliday1": true,
  "isHoliday2": true,
  "holidayStatus": "⚠️ BOTH COUNTRIES ON HOLIDAY (Jan 01) - Consider next business day",
  "nextBusinessDay1": "2026-01-02 (Fri)",
  "nextBusinessDay2": "2026-01-02 (Fri)",
  "message": "When it's 10:00 in US, it's 15:00 in UK. ⚠️ BOTH COUNTRIES ON HOLIDAY (Jan 01) - Consider next business day"
}
```

## Response Fields Explanation

- **isHoliday1/isHoliday2:** Boolean indicating if the date is a holiday
- **holidayStatus:** Warning message if any country is on holiday
- **nextBusinessDay1/nextBusinessDay2:** Next available business day (skips weekends and holidays)
- **message:** User-friendly summary including holiday warnings

## Supported Country Codes

US, UK, INDIA, JAPAN, GERMANY, DUBAI, SINGAPORE, AUSTRALIA, BRAZIL, FRANCE, CHINA

## Notes

- Holidays are checked using YYYY-MM-DD format
- Weekends (Saturday, Sunday) are automatically excluded
- The tool looks for 30 days ahead for the next business day
- Multiple holidays can be set per country (comma-separated)
- Environment variables are case-insensitive for country names in API calls

## Deployment After Setting Holidays

After adding holiday variables in Railway:

1. Go to your Railway service
2. Click **Deploy** button (if changes don't auto-trigger deployment)
3. Wait for deployment to complete
4. Test with Postman to verify
