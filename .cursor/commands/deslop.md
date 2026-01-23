# Remove AI code slop

Check the diff against main, and remove all AI generated slop introduced in this branch.

This includes:
- Extra comments that a human wouldn't add or is inconsistent with the rest of the file
- Extra defensive checks or try/catch blocks that are abnormal for that area of the codebase (especially if called by trusted / validated codepaths)
- Casts to any to get around type issues
- Any other style that is inconsistent with the file
- not needed console.log() or debug stfuff
- is UseEffect needed here or not please check wether it is need or can be replaced with React Query
- Make sure there is no one huge fille with a lot of work break down the files into smaller chuckes plesae

Report at the end with only a 1-3 sentence summary of what you changed