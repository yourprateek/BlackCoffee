# ☕ BlackCoffee

CodeBuild Hackathon

---

## 🔧 Getting Started with GitHub

Follow these steps to get set up and start contributing.

### Step 1: Install Git

Download and install Git from [git-scm.com](https://git-scm.com/) if you haven't already.

### Step 2: Connect to the Repo

Open a terminal in your project folder and run:

```bash
git init
```
Initializes Git in this folder.

```bash
git remote add origin https://github.com/yourprateek/BlackCoffee.git
```
Connects your local folder to the GitHub repo.

```bash
git remote -v
```
Confirms the connection was successful — you should see the repo URL listed.

```bash
git pull origin main
```
Pulls the latest code already on GitHub. Always pull before you push anything to avoid merge conflicts

> ⚠️ **Never work directly on `main`.** Always create your own branch first.

```bash
git checkout -b name-of-branch
```
Creates a new branch and switches you onto it.

```bash
git branch
```
Confirms which branch you're currently on. It should **never** say `main` while you're working.

---

### Step 3: Do Your Work

As you make progress, stage and commit your changes regularly — don't wait until everything is done.

```bash
git status
```
Shows what's changed since your last commit.

```bash
git add .
```
Stages all changed files. (`git add -A` works the same way.)

```bash
git commit -m "your message here"
```
Commits your staged changes. Think of this like the subject line of an email — keep it short and describe *what* changed.

---

### Step 4: Push Your Branch

```bash
git push -u origin name-of-branch
```
Pushes your branch to GitHub. The `-u` links it so future pushes just need `git push`.

---

### Step 5: Open a Pull Request

1. Go to the repo on GitHub — you'll see a banner: **"Compare & pull request"** for your branch. Click it.
2. Write a short description of what you did.
3. Open the PR against `main`.

Your collaborators can review, comment, and request changes. Once approved, merge it into `main` using the button on GitHub.

---

## ✅ Quick Recap

| Step | Command |
|------|---------|
| Initialize repo | `git init` |
| Connect to GitHub | `git remote add origin <url>` |
| Pull latest code | `git pull origin main` |
| Create a branch | `git checkout -b name-of-branch` |
| Stage changes | `git add .` |
| Commit changes | `git commit -m "message"` |
| Push branch | `git push -u origin name-of-branch` |

**Rule of thumb:** branch → work → commit often → push → open a PR → merge after review.