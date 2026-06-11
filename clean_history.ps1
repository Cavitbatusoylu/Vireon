$ErrorActionPreference = "Stop"

# Get commits in reverse chronological order (oldest first)
$commits = git log --reverse --format="%H|%an|%ad|%s" --no-merges Cavit-login

$isFirst = $true

foreach ($line in $commits) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    
    $parts = $line.Split('|', 4)
    $hash = $parts[0]
    $author = $parts[1]
    $date = $parts[2]
    $msg = $parts[3]

    if ($isFirst) {
        Write-Host "Starting from root commit: $hash - $msg"
        git checkout -b Cavit-login-clean $hash
        $isFirst = $false
        continue
    }

    # Junk commits to squash
    if ($msg -match "^chore: auto-sync" -or $msg -match "^Update$" -or $msg -match "^ilk test commit" -or $msg -match "^Merge" -or $msg -match "Enes Branchinden Degisiklikler Atandi") {
        Write-Host "Squashing junk commit: $hash - $msg"
        git cherry-pick -n $hash
        if ($LASTEXITCODE -ne 0) {
            # Handle conflict automatically by favoring the incoming changes for chores
            # But usually chore commits don't conflict much. If they do, we accept all.
            git add -A
        }
        # Commit the squashed changes without changing the previous commit's message or date
        git commit --amend --no-edit
    } else {
        Write-Host "Keeping feat/fix commit: $hash - $msg"
        git cherry-pick $hash
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Conflict during cherry-pick of $hash. Resolving with incoming changes..."
            git checkout --theirs .
            git add -A
            # Original cherry-pick keeps author and date! We just need to commit it.
            $env:GIT_AUTHOR_NAME = $author
            $env:GIT_AUTHOR_DATE = $date
            $env:GIT_COMMITTER_NAME = $author
            $env:GIT_COMMITTER_DATE = $date
            git commit -m $msg
        }
    }
}
Write-Host "Done!"
