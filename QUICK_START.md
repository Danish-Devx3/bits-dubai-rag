# Quick Start Guide - BITS Dubai RAG Assistant

## 🚀 Getting Started in 5 Minutes

### Step 1: Install Dependencies
```bash
cd bits-dubai-rag
npm install
```

### Step 2: Configure API URL
Create `.env.local` file:
```bash
echo "NEXT_PUBLIC_API_URL=http://localhost:9621" > .env.local
```

Or manually create `.env.local` and add:
```
NEXT_PUBLIC_API_URL=http://localhost:9621
```

### Step 3: Start RAG-Anything Backend
Make sure your RAG-Anything server is running with collections support:
```bash
# In RAG-Anything directory
python run_web_ui_with_collections.py
```

### Step 4: Start Frontend
```bash
npm run dev
```

### Step 5: Open Browser
Navigate to: http://localhost:3000

## 📝 Usage Examples

### For Students:
1. Select a collection (e.g., "CSE", "Math") or leave as "All Collections"
2. Ask questions like:
   - "What is the syllabus for 3rd year CSE this semester?"
   - "Tell me about assignment deadlines"
   - "What are the course requirements for Data Structures?"
3. Click "Full Screen" for immersive experience

### For Admins:
1. Go to "Upload Documents" tab
2. Select a collection (subject/department)
3. Upload PDF, DOC, DOCX, TXT, or MD files
4. Documents become searchable immediately

## 🎨 Features

- ✅ Full-screen chat mode
- ✅ Collection-based filtering
- ✅ Document upload interface
- ✅ Real-time responses
- ✅ Markdown support in responses
- ✅ Responsive design
- ✅ Professional UI

## 🔧 Troubleshooting

**API Connection Failed?**
- Check if RAG-Anything server is running
- Verify `NEXT_PUBLIC_API_URL` in `.env.local`
- Check browser console for CORS errors

**Collections Not Loading?**
- Ensure you're using `run_web_ui_with_collections.py` (not `run_web_ui.py`)
- Check backend logs
- Try refreshing the page

**Build Errors?**
- Run `npm install` again
- Clear `.next` folder: `rm -rf .next`
- Check Node.js version (18+ required)

## 📦 Production Build

```bash
npm run build
npm start
```

## 🌐 Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Import in Vercel
3. Add env var: `NEXT_PUBLIC_API_URL`
4. Deploy!

---

**Need Help?** Check the main README.md for detailed documentation.

