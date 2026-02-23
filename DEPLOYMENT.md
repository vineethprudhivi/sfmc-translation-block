# Deployment Guide

This guide covers deploying the SFMC Translation Custom Block to Vercel and integrating it with SFMC.

## Prerequisites

- ✅ GitHub account
- ✅ Vercel account (free tier works fine)
- ✅ SFMC account with Content Builder access
- ✅ Data Extension created in SFMC

## Step 1: Push to GitHub

1. **Initialize Git repository** (if not already done):
   ```powershell
   git init
   git add .
   git commit -m "Initial commit: SFMC Translation Custom Block"
   ```

2. **Create a new repository on GitHub**:
   - Go to https://github.com/new
   - Repository name: `sfmc-translation-block` (or your preferred name)
   - Privacy: **Public** or **Private** (both work with Vercel)
   - Don't initialize with README (we already have one)
   - Click "Create repository"

3. **Push your code**:
   ```powershell
   git remote add origin https://github.com/YOUR-USERNAME/sfmc-translation-block.git
   git branch -M main
   git push -u origin main
   ```

## Step 2: Deploy to Vercel

### Option A: Using Vercel Dashboard (Recommended)

1. **Go to Vercel**:
   - Visit https://vercel.com
   - Sign in with your GitHub account

2. **Import Project**:
   - Click "Add New..." → "Project"
   - Select your GitHub repository (`sfmc-translation-block`)
   - Click "Import"

3. **Configure Project**:
   - Framework Preset: **Other** (or leave as detected)
   - Root Directory: `./` (leave as default)
   - Build Command: Leave empty
   - Output Directory: `./` (leave as default)
   - Click "Deploy"

4. **Wait for deployment**:
   - Vercel will build and deploy (takes ~30 seconds)
   - You'll get a URL like: `https://sfmc-translation-block.vercel.app`

### Option B: Using Vercel CLI

1. **Install Vercel CLI**:
   ```powershell
   npm install -g vercel
   ```

2. **Login**:
   ```powershell
   vercel login
   ```

3. **Deploy**:
   ```powershell
   # For preview deployment
   vercel
   
   # For production deployment
   vercel --prod
   ```

## Step 3: Verify Deployment

1. **Open the deployed URL** in your browser
2. **You should see** the Email Translation Data Entry interface
3. **Test functionality**:
   - Enter an email name
   - Add field names and values
   - Click "Save to Data Extension"
   - Should show success message (simulation mode without SFMC)

## Step 4: Configure SFMC Data Extension

1. **Navigate to SFMC Contact Builder** → Data Extensions

2. **Create New Data Extension**:
   - Name: `Translation Data Extension`
   - External Key: Use the value in your `customBlock.js` (currently: `D4344287-6DDF-49F6-B7A5-A7E0043A3C2C`)
   - Or create a new one and update `customBlock.js`

3. **Add Fields**:
   
   | Field Name | Data Type | Length | Primary Key | Required | Default Value |
   |------------|-----------|--------|-------------|----------|---------------|
   | email name | Text      | 255    | ✓           | ✓        | -             |
   | fieldname  | Text      | 255    | ✓           | ✓        | -             |
   | field value| Text      | 4000   | ✗           | ✓        | -             |
   | EntryDate  | Date      | -      | ✗           | ✗        | Current Date  |

4. **Set Composite Primary Key**: 
   - Check both `email name` AND `fieldname` as primary keys
   - This allows multiple fields per email

5. **Save the Data Extension**

## Step 5: Add Custom Block to SFMC

1. **Navigate to Content Builder**

2. **Create Custom Content Block**:
   - Content Builder → Create → Custom Content Block
   - Name: `Email Translation Data Entry`
   
3. **Configure the Block**:
   - **Content URL**: Your Vercel deployment URL
     ```
     https://your-project-name.vercel.app/index.html
     ```
   - Click "Next"
   - Click "Save"

4. **Test in an Email**:
   - Create a new email
   - Drag your custom block into the email
   - The block should load and function properly

## Step 6: Test End-to-End

1. **In SFMC Content Builder**:
   - Open an email with your custom block
   - Enter an email name (e.g., "Welcome Email")
   - Add fields (subject, preheader, etc.) with values
   - Click "Save to Data Extension"

2. **Verify Data in DE**:
   - Go to Contact Builder → Data Extensions
   - Find your Translation Data Extension
   - Click "Records"
   - You should see rows with your data

## Updating Your Deployment

### Update Code:
```powershell
# Make your changes
git add .
git commit -m "Description of changes"
git push origin main
```

### Vercel Auto-Deploys:
- Vercel automatically deploys when you push to `main` branch
- Check deployment status at https://vercel.com/dashboard
- Each commit gets a unique preview URL
- Main branch deploys to production

## Troubleshooting

### Block Doesn't Load in SFMC
- **Check HTTPS**: Vercel uses HTTPS by default ✓
- **Check CORS**: `vercel.json` has CORS headers configured ✓
- **Check Content URL**: Must be the full URL with `https://`
- **Clear Browser Cache**: Try in incognito mode

### Data Not Saving to DE
- **Verify External Key**: Must match exactly in `customBlock.js` and SFMC
- **Check Primary Keys**: Both `email name` and `fieldname` must be PKs
- **Check API Permissions**: Ensure your user has DE write permissions
- **Browser Console**: Check for error messages (F12)

### Deployment Failed on Vercel
- **Check vercel.json**: Must be valid JSON
- **Check File Names**: Case-sensitive on deployment
- **Check Logs**: View deployment logs in Vercel dashboard

## Environment-Specific Configuration

If you need different configs for dev/staging/prod:

1. **Create environment-specific files**:
   - `customBlock.dev.js`
   - `customBlock.prod.js`

2. **Use Vercel Environment Variables**:
   - Dashboard → Project → Settings → Environment Variables
   - Add `DE_EXTERNAL_KEY` with different values per environment

3. **Update `customBlock.js` to read env vars** (requires build step with Node.js)

## Security Best Practices

✅ **HTTPS Only**: Vercel provides free SSL  
✅ **CORS Configured**: Allows SFMC to embed the block  
✅ **Input Sanitization**: All user input is sanitized  
✅ **No Secrets in Code**: DE key is not sensitive (it's an identifier)  
✅ **Frame Protection**: Security headers configured in `vercel.json`

## URLs to Know

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Deployment Logs**: Vercel Dashboard → Your Project → Deployments
- **Production URL**: `https://your-project.vercel.app`
- **GitHub Repo**: `https://github.com/your-username/sfmc-translation-block`

## Support

For issues:
1. Check Vercel deployment logs
2. Check browser console (F12)
3. Check SFMC Data Extension schema
4. Review README.md for troubleshooting

---

**Last Updated**: February 23, 2026
