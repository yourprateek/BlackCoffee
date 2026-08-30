# BlackCoffee
CodeBuild Hackathon


## Using Github:
Step 1: install git
Step 2: open terminal in the folder of the code and type:
    (1) git innit --to initiate git in that folder.
    (2) git remote add origin https://github.com/yourprateek/BlackCoffee.git --to connect to github repo
    (3) git remote -v --to check if connected successfully
    (4) git pull origin main --to pull a copy of code already uploaded
### Note: Never work directly on main branch
    (5) git checkout -b nameOfBranch --to make a new branch and switch to it
    (6) git branch --to check if current branch is the one you think it is(never should it be main when collaborating with others)
Step 3: Do your work and stage commits regularly
    (1) git status --to see what changed when you are doing your work
    (2) git add . (or) git add -A to --stage changes
    (3) git commit -m "custom message" --This like header of an email, message should be what changes you did in short
Step 4: git push -u origin nameOfBranch --to push your changes to remote directory