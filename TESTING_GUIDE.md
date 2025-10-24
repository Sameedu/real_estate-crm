# EstateHub Testing Guide

## Quick Test Scenarios

### 1. Test Authentication

**Sign Up**
```
1. Open app
2. Click "Sign Up"
3. Enter:
   - Name: Test User
   - Email: test@example.com
   - Phone: +91 9876543210
   - Password: password123
4. Should redirect to survey
```

**Sign In with Wrong Password**
```
1. Enter email: test@example.com
2. Enter password: wrongpassword
3. Should show: "Incorrect email or password. Please try again."
```

**Admin Login**
```
1. Email: admin@example.com
2. Password: pass123
3. Should see admin features (Properties tab in navbar)
```

### 2. Test Survey & Matching

**Complete Survey**
```
1. After signup, fill survey:
   - City: Bangalore
   - Max Price: 10000000
   - Type: apartment
   - Size: 1000-2000 sq.ft
   - Bedrooms: 2
2. Click "Save Preferences"
3. Should automatically find matches
4. Webhook POST sent to http://localhost:5678/webhook/match
```

**Manual Match Check**
```
1. Go to Matches tab
2. Click "Check Matches" button
3. Should display: "Found X new property matches! Match details sent to webhook."
4. Matches displayed with scores
```

### 3. Test Chat

**Send Message**
```
1. Go to Chat tab
2. Type: "Hello"
3. Press Send
4. Should receive intelligent response
5. If webhook fails, fallback response shown
6. Message history saved
```

**Test Webhook**
```
1. Type: "Show me properties in Bangalore"
2. POST sent to http://localhost:5678/webhook/chat
3. Response displayed in chat
```

### 4. Test Admin Features

**Add Property**
```
1. Login as admin@example.com
2. Click Properties tab
3. Click "Add Property"
4. Fill all fields:
   - Title: Test Property
   - Price: 5000000
   - Type: apartment
   - City: Bangalore
   - Location: Test Location
   - Size: 1000 sq.ft
   - Bedrooms: 2
   - Image: (optional URL)
5. Click "Add Property"
6. Should appear in property list
```

**Edit Property**
```
1. Hover over property card
2. Click edit icon (top right)
3. Modify details
4. Click "Update Property"
5. Changes saved
```

**Delete Property**
```
1. Hover over property card
2. Click delete icon (top right)
3. Confirm deletion
4. Property removed
```

### 5. Test Property Search

**Browse Properties**
```
1. Go to Search tab
2. All 17 properties displayed
3. Filter by:
   - City (dropdown)
   - Type (buttons)
   - Price range (min/max inputs)
4. Results update in real-time
```

**Search Query**
```
1. Type in search box: "villa"
2. Press Enter
3. Filters to villa properties
4. Search saved to history
```

### 6. Test Dashboard (Admin Only)

**View Statistics**
```
1. Login as admin
2. Go to Dashboard tab
3. View:
   - Total Users
   - Total Searches
   - Chat Messages
   - Engagement metrics
4. See recent activity feed
```

**Daily Match Check**
```
1. In Dashboard
2. Click "Run Daily Check" button
3. Processes all users needing matches
4. Sends webhooks for each user
5. Shows: "Daily matches checked and notifications sent!"
```

### 7. Test Match Display

**View Matches**
```
1. Go to Matches tab
2. Should show all matched properties
3. Each match displays:
   - Property image and details
   - Match score percentage
   - "NEW" badge if unviewed
4. Click property to mark as viewed
5. Badge disappears
```

**Match Scoring**
```
Verify scores:
- 100% = perfect match (all criteria)
- 80% = 3 of 4 criteria
- 55% = 2 of 4 criteria
- Minimum 50% shown
```

### 8. Test Dark Mode

**Toggle Theme**
```
1. Click moon/sun icon in navbar
2. Theme switches instantly
3. All pages support dark mode
4. Preference saved
```

### 9. Test Responsive Design

**Mobile View**
```
1. Resize browser to mobile width
2. Navigation moves to bottom
3. Cards stack vertically
4. All features accessible
5. Touch-friendly buttons
```

### 10. Webhook Payload Testing

**Match Webhook**
```json
POST http://localhost:5678/webhook/match
{
  "user_id": "uuid",
  "user_email": "test@example.com",
  "user_name": "Test User",
  "matches": [
    {
      "property_id": "uuid",
      "property_title": "2BHK Apartment",
      "property_price": 6500000,
      "property_location": "Indiranagar",
      "property_city": "Bangalore",
      "property_type": "apartment",
      "property_image": "https://...",
      "match_score": 80,
      "match_details": {
        "city_match": true,
        "type_match": true,
        "price_match": true,
        "bedrooms_match": false
      }
    }
  ],
  "timestamp": "2025-10-24T15:30:00Z"
}
```

**Chat Webhook**
```json
POST http://localhost:5678/webhook/chat
{
  "event": "chat",
  "user_id": "uuid",
  "message": "Show me properties in Bangalore"
}
```

## Expected Results

### Successful Tests

✓ **Authentication**
- Sign up creates user and profile
- Sign in works with correct credentials
- Wrong password shows error
- Admin login grants special access

✓ **Matching**
- Survey completion triggers matches
- Find Matches button works
- Matches display with scores
- Webhooks sent successfully
- NEW badges appear/disappear

✓ **Chat**
- Messages send and save
- Bot responses appear
- Webhook integration works
- Fallback responses when webhook down
- History persists

✓ **Admin**
- Properties can be added/edited/deleted
- Admin panel accessible
- Dashboard shows stats
- Daily match check works

✓ **Database**
- All data persists
- RLS prevents unauthorized access
- Match function calculates correctly
- Indexes optimize queries

## Debugging

### Match not found?
- Check user preferences in database
- Verify properties exist that match criteria
- Ensure match_score >= 50
- Check if matches already exist (duplicates prevented)

### Webhook not working?
- Verify n8n is running on localhost:5678
- Check webhook URLs in .env
- Fallback responses should still work
- Check browser console for errors

### Admin features not showing?
- Login with admin@example.com / pass123
- Check is_admin flag in profiles table
- Verify RLS policies allow admin access

### Chat not responding?
- Fallback responses always work
- Check webhook configuration
- Verify n8n webhook endpoint
- Check browser network tab

## Performance Checks

- Initial load: < 3 seconds
- Property list render: < 1 second
- Match calculation: < 2 seconds
- Chat response: < 3 seconds (with webhook)
- Search filter: instant

## Browser Console

Should see no errors. Acceptable warnings:
- Browserslist outdated (npm package)
- Image loading delays (external URLs)

## Database Verification

```sql
-- Check properties
SELECT COUNT(*) FROM properties; -- Should be 17

-- Check admin user
SELECT * FROM profiles WHERE is_admin = true;

-- Check match function
SELECT * FROM find_matches_for_user('user-uuid-here');
```

## Final Checklist

- [ ] Build completes without errors
- [ ] All pages load correctly
- [ ] Authentication works
- [ ] Survey saves preferences
- [ ] Matches display and update
- [ ] Chat sends/receives messages
- [ ] Admin can manage properties
- [ ] Dashboard shows statistics
- [ ] Webhooks send data
- [ ] Dark mode toggles
- [ ] Mobile responsive
- [ ] No console errors
- [ ] Database has 17 properties
- [ ] RLS policies secure data

## Test User Accounts

**Regular User**
- Create via signup
- Or use: test@example.com

**Admin User**
- Email: admin@example.com
- Password: pass123

## Environment Check

```bash
# Verify build
npm run build

# Check environment variables
cat .env

# Verify Supabase connection
# (check browser console after opening app)
```

All tests should pass for production deployment!
