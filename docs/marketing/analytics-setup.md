# Marketing Analytics Setup Guide

## Overview

This document outlines the analytics tracking setup for the AI Tutoring Platform launch and ongoing marketing efforts.

## Analytics Tools

### 1. Google Analytics 4 (GA4)

**Purpose**: Track website traffic, user behavior, and conversions

**Setup Steps**:

1. Create GA4 property
2. Install gtag.js on all pages
3. Configure data streams
4. Set up conversion events
5. Link to Google Ads

**Implementation**:

```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### 2. Google Tag Manager (GTM)

**Purpose**: Manage all tracking tags without code changes

**Setup Steps**:

1. Create GTM container
2. Install GTM code on all pages
3. Configure tags, triggers, and variables
4. Test in preview mode
5. Publish container

**Implementation**:

```html
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-XXXXXXX');</script>
<!-- End Google Tag Manager -->
```

### 3. Facebook Pixel

**Purpose**: Track conversions from Facebook/Instagram ads

**Setup Steps**:

1. Create Facebook Pixel in Events Manager
2. Install pixel code on all pages
3. Configure standard events
4. Set up custom conversions
5. Test with Facebook Pixel Helper

**Implementation**:

```html
<!-- Facebook Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', 'XXXXXXXXXXXXXXX');
fbq('track', 'PageView');
</script>
```

### 4. Mixpanel

**Purpose**: Product analytics and user behavior tracking

**Setup Steps**:

1. Create Mixpanel project
2. Install SDK in application
3. Configure events and properties
4. Set up user profiles
5. Create funnels and cohorts

**Implementation**:

```javascript
// Initialize Mixpanel
mixpanel.init('YOUR_PROJECT_TOKEN');

// Track events
mixpanel.track('Feature Used', {
  'Feature Name': 'AI Chat',
  'User Type': 'Student',
  'Subscription': 'Premium'
});

// Identify users
mixpanel.identify(userId);
mixpanel.people.set({
  '$email': userEmail,
  '$name': userName,
  'Subscription': 'Premium'
});
```

### 5. Hotjar

**Purpose**: Heatmaps, session recordings, and user feedback

**Setup Steps**:

1. Create Hotjar account
2. Install tracking code
3. Configure heatmaps for key pages
4. Set up session recordings
5. Create feedback polls

## Event Tracking

### Landing Page Events

```javascript
// Page view
gtag('event', 'page_view', {
  'page_title': 'Home',
  'page_location': window.location.href
});

// CTA clicks
gtag('event', 'cta_click', {
  'button_text': 'Start Free Trial',
  'button_location': 'Hero Section'
});

// Video interactions
gtag('event', 'video_play', {
  'video_title': 'Platform Demo',
  'video_duration': 180
});

// Scroll depth
gtag('event', 'scroll', {
  'percent_scrolled': 75
});

// Feature card clicks
gtag('event', 'feature_click', {
  'feature_name': 'AI Explanations'
});
```

### Signup Flow Events

```javascript
// Signup started
gtag('event', 'sign_up_start', {
  'method': 'Email',
  'source': 'Landing Page'
});

// Signup completed
gtag('event', 'sign_up', {
  'method': 'Email',
  'user_type': 'Student'
});

// Trial started
gtag('event', 'trial_start', {
  'plan': 'Premium',
  'trial_days': 14
});

// Onboarding completed
gtag('event', 'onboarding_complete', {
  'steps_completed': 5,
  'time_spent': 180
});
```

### Product Usage Events

```javascript
// AI query
gtag('event', 'ai_query', {
  'subject': 'Mathematics',
  'query_length': 50,
  'response_time': 1.5
});

// Test generated
gtag('event', 'test_generate', {
  'subject': 'Mathematics',
  'question_count': 10,
  'difficulty': 'Medium'
});

// Test completed
gtag('event', 'test_complete', {
  'test_id': 'test_123',
  'score': 85,
  'time_spent': 600
});

// Learning plan viewed
gtag('event', 'learning_plan_view', {
  'tasks_count': 5,
  'completion_rate': 60
});

// Progress checked
gtag('event', 'progress_view', {
  'view_type': 'Analytics Dashboard'
});
```

### Conversion Events

```javascript
// Trial to paid conversion
gtag('event', 'purchase', {
  'transaction_id': 'txn_123',
  'value': 15.00,
  'currency': 'USD',
  'items': [{
    'item_id': 'premium_monthly',
    'item_name': 'Premium Monthly',
    'price': 15.00,
    'quantity': 1
  }]
});

// Upgrade
gtag('event', 'upgrade', {
  'from_plan': 'Free',
  'to_plan': 'Premium',
  'value': 15.00
});

// Referral
gtag('event', 'referral', {
  'referrer_id': 'user_123',
  'referee_id': 'user_456'
});
```

## UTM Parameters

### Campaign Structure

**Format**: `?utm_source={source}&utm_medium={medium}&utm_campaign={campaign}&utm_content={content}&utm_term={term}`

### Launch Campaign UTMs

**Social Media**:
```
Twitter: ?utm_source=twitter&utm_medium=social&utm_campaign=launch&utm_content=thread
LinkedIn: ?utm_source=linkedin&utm_medium=social&utm_campaign=launch&utm_content=post
Facebook: ?utm_source=facebook&utm_medium=social&utm_campaign=launch&utm_content=post
Instagram: ?utm_source=instagram&utm_medium=social&utm_campaign=launch&utm_content=story
```

**Email**:
```
Newsletter: ?utm_source=email&utm_medium=email&utm_campaign=launch&utm_content=newsletter
Beta List: ?utm_source=email&utm_medium=email&utm_campaign=launch&utm_content=beta_list
```

**Paid Ads**:
```
Google Ads: ?utm_source=google&utm_medium=cpc&utm_campaign=launch&utm_term={keyword}
Facebook Ads: ?utm_source=facebook&utm_medium=cpc&utm_campaign=launch&utm_content={ad_id}
```

**Press & PR**:
```
Press Release: ?utm_source=press&utm_medium=referral&utm_campaign=launch
Blog Post: ?utm_source=blog&utm_medium=referral&utm_campaign=launch
```

### URL Builder

Use Google's Campaign URL Builder: https://ga-dev-tools.google/campaign-url-builder/

## Conversion Tracking

### Key Conversions

1. **Signup** - User creates account
2. **Trial Start** - User activates free trial
3. **Onboarding Complete** - User completes setup
4. **First AI Query** - User asks first question
5. **First Test** - User takes first test
6. **Trial Convert** - User converts to paid
7. **Referral** - User refers someone

### Conversion Funnels

**Signup Funnel**:
1. Landing page visit
2. Click "Start Free Trial"
3. Enter email
4. Create password
5. Complete profile
6. Verify email
7. Onboarding complete

**Trial to Paid Funnel**:
1. Trial start
2. First AI query
3. First test
4. View analytics
5. Receive trial ending email
6. Visit pricing page
7. Enter payment info
8. Purchase complete

## Dashboard Setup

### Google Analytics Dashboard

**Widgets**:
1. Real-time users
2. User acquisition (source/medium)
3. Conversion rate by source
4. Top landing pages
5. Signup funnel
6. Trial to paid conversion
7. User engagement metrics
8. Revenue tracking

### Custom Reports

**Launch Performance Report**:
- Traffic by source
- Conversion rate by source
- Cost per acquisition
- Return on ad spend
- User demographics
- Device breakdown

**Product Usage Report**:
- Daily/weekly/monthly active users
- Feature adoption rates
- Session duration
- Pages per session
- Retention cohorts
- Churn rate

**Revenue Report**:
- Monthly recurring revenue (MRR)
- Customer lifetime value (LTV)
- Churn rate
- Upgrade/downgrade rates
- Revenue by plan
- Revenue by acquisition source

## A/B Testing

### Tools

- **Google Optimize**: Landing page tests
- **Optimizely**: Product feature tests
- **VWO**: Conversion optimization

### Test Ideas

**Landing Page**:
- Hero headline variations
- CTA button text and color
- Pricing display
- Social proof placement
- Video vs. static image

**Signup Flow**:
- Single page vs. multi-step
- Required fields
- Social login options
- Trial length (7 vs. 14 days)

**Pricing Page**:
- Monthly vs. annual emphasis
- Feature comparison layout
- Pricing tiers (2 vs. 3 options)
- Free trial prominence

## Monitoring & Alerts

### Set Up Alerts For:

**Traffic Anomalies**:
- Traffic drops >20%
- Traffic spikes >50%
- Bounce rate >70%

**Conversion Issues**:
- Conversion rate drops >15%
- Signup errors increase
- Payment failures increase

**Performance Issues**:
- Page load time >3 seconds
- Error rate >1%
- API response time >2 seconds

### Alert Channels:
- Email notifications
- Slack integration
- SMS for critical issues

## Privacy & Compliance

### GDPR Compliance

- Cookie consent banner
- Privacy policy link
- Data processing agreement
- User data export/deletion
- Anonymize IP addresses

### Implementation:

```javascript
// Cookie consent
window.addEventListener('load', function() {
  if (!getCookie('cookie_consent')) {
    showCookieBanner();
  }
});

// Anonymize IP in GA4
gtag('config', 'G-XXXXXXXXXX', {
  'anonymize_ip': true
});
```

## Reporting Schedule

### Daily:
- Traffic overview
- Conversion rate
- Revenue
- Critical alerts

### Weekly:
- Detailed traffic analysis
- Campaign performance
- A/B test results
- User feedback summary

### Monthly:
- Comprehensive performance report
- ROI analysis
- User cohort analysis
- Strategic recommendations

## Key Metrics to Track

### Acquisition:
- Website visitors
- Traffic sources
- Cost per click (CPC)
- Cost per acquisition (CPA)

### Activation:
- Signup rate
- Onboarding completion rate
- Time to first value
- Feature adoption rate

### Retention:
- Daily/weekly/monthly active users
- Retention rate by cohort
- Churn rate
- Session frequency

### Revenue:
- Monthly recurring revenue (MRR)
- Average revenue per user (ARPU)
- Customer lifetime value (LTV)
- LTV:CAC ratio

### Referral:
- Referral rate
- Viral coefficient
- Referral conversion rate

## Tools & Resources

### Analytics:
- Google Analytics 4
- Mixpanel
- Amplitude

### Heatmaps & Recordings:
- Hotjar
- FullStory
- Crazy Egg

### A/B Testing:
- Google Optimize
- Optimizely
- VWO

### Attribution:
- Google Attribution
- Segment
- Branch

### Dashboards:
- Google Data Studio
- Tableau
- Metabase

---

**Setup Checklist**:

- [ ] Google Analytics 4 configured
- [ ] Google Tag Manager installed
- [ ] Facebook Pixel installed
- [ ] Mixpanel integrated
- [ ] Hotjar tracking enabled
- [ ] UTM parameters documented
- [ ] Conversion events configured
- [ ] Dashboards created
- [ ] Alerts set up
- [ ] Privacy compliance implemented
- [ ] Team trained on analytics
- [ ] Reporting schedule established

**Owner**: Marketing Team  
**Last Updated**: November 2025  
**Next Review**: Monthly
