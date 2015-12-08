Function GetStableVersion () {
    # Download "channel-rust-stable" file and its sha256.
    $file_name = "channel-rust-stable"
    $file = $env:TEMP + "\" + $file_name
    Remove-Item "$file" -ErrorAction SilentlyContinue
    [io.file]::WriteAllBytes("$file",(Invoke-WebRequest -URI "http://static.rust-lang.org/dist/$file_name" -Headers @{"Accept-Encoding"="gzip, deflate"}).content)
    Remove-Item "$file.sha256" -ErrorAction SilentlyContinue
    [io.file]::WriteAllBytes("$file.sha256",(Invoke-WebRequest -URI "http://static.rust-lang.org/dist/$file_name.sha256" -Headers @{"Accept-Encoding"="gzip, deflate"}).content)

    # Validate the download
    $sha256 = (Get-FileHash $file -Algorithm SHA256 | Format-Wide -Property Hash -AutoSize) | Out-String
    $sha256 = $sha256.Trim()
    Select-String -Pattern $sha256 -Path "$file.sha256" -SimpleMatch -Quiet -OutVariable hash_check >$null
    Select-String -Pattern $file_name -Path "$file.sha256" -CaseSensitive -SimpleMatch -Quiet -OutVariable name_check >$null
    If (-Not ($hash_check -and $name_check)) {
        Throw [System.IO.InvalidDataException] "Failed to validate $file."
    }

    # Get the version from the download
    Select-String -Pattern "rust-([0-9]\.[0-9]\.[0-9])-x86_64-pc-windows-gnu\.msi" -Path "$file" | % {$_.Matches} | % {$_.Groups[1].Value}
}

Function Install ($channel) {
    # Set variable if this is a stable channel
    $stable = (-Not (($channel -eq "nightly") -or ($channel -eq "beta")))
    $channel_name = If ($stable) { "stable" } Else { $channel }

    # Download sha256 of msi to check whether installed version is still up to date.
    $msi_name = "rust-$channel-x86_64-pc-windows-gnu.msi"
    $msi = $env:TEMP + "\" + $msi_name
    Remove-Item "$msi.sha256" -ErrorAction SilentlyContinue
    [io.file]::WriteAllBytes("$msi.sha256",(Invoke-WebRequest -URI "http://static.rust-lang.org/dist/rust-$channel-x86_64-pc-windows-gnu.msi.sha256" -Headers @{"Accept-Encoding"="gzip, deflate"}).content)

    $client = New-Object System.Net.WebClient
#    $client.DownloadFile("http://static.rust-lang.org/dist/rust-$channel-x86_64-pc-windows-gnu.msi.sha256", "$msi.sha256")

    # Check for existing installed version
    $existing_path = ([Environment]::GetEnvironmentVariable("RUST_" + $channel.ToUpper(), "Machine")) | Out-String
    If ($existing_path) {
        "Checking for newer version of $channel_name Rust"
        $existing_path = $existing_path.Trim()
        $env:Path = "$existing_path\bin;$env:Path"
        $existing_version = (rustc --version) | Out-String
        $existing_version = $existing_version.Trim()

        # Check current msi against fresh sha256
        $old_msi = $existing_path + "\" + $msi_name
        $sha256 = (Get-FileHash $old_msi -Algorithm SHA256 | Format-Wide -Property Hash -AutoSize) | Out-String
        $sha256 = $sha256.Trim()
        Select-String -Pattern $sha256 -Path "$msi.sha256" -SimpleMatch -Quiet -OutVariable hash_check >$null
        Select-String -Pattern $msi_name -Path "$msi.sha256" -CaseSensitive -SimpleMatch -Quiet -OutVariable name_check >$null
        If ($hash_check -and $name_check) {
            Remove-Item "$msi.sha256" -ErrorAction SilentlyContinue
            $foreground_colour = (Get-Host).UI.RawUI.ForegroundColor.ToString()
            (Get-Host).UI.RawUI.ForegroundColor = "green"
            "Currently installed $existing_version is up to date"
            (Get-Host).UI.RawUI.ForegroundColor = $foreground_colour
            return
        }

        # Uninstall existing version
        "Uninstalling $existing_version"
        [Environment]::SetEnvironmentVariable("RUST_" + $channel.ToUpper(), $null, "Machine")
        If ($stable) {
            [Environment]::SetEnvironmentVariable("RUST_STABLE", $null, "Machine")
        }
        $uninstall_log = $env:TEMP + "\rust-$channel-uninstall.log"
        Remove-Item $uninstall_log -ErrorAction SilentlyContinue
        Start-Job { msiexec /uninstall $args[0] /quiet /norestart /log $args[1] } -Args $old_msi,$uninstall_log >$null

        # Wait-Job and Receive-Job aren't reliable for waiting for the uninstall to complete nor to find the result of the
        # uninstall.  We can work around this by waiting for the uninstall log to get generated and then read its contents.
        $timeout = New-TimeSpan -Minutes 5
        $timer = [Diagnostics.Stopwatch]::StartNew()
        $uninstall_success = $false
        While (-Not ($uninstall_success -or ($timer.Elapsed -gt $timeout))) {
            Start-Sleep -Milliseconds 100
            If (-Not (Test-Path $uninstall_log)) { Continue }
            Select-String -Pattern " -- Removal completed successfully\." -Path $uninstall_log -CaseSensitive -Quiet -OutVariable uninstall_success >$null
        }

        # Check uninstall log was created.
        If (-Not (Test-Path $uninstall_log)) {
            Throw [System.Exception] "Failed to uninstall $old_msi.  Uninstall log missing."
        }

        # Check uninstall log shows success
        If (-Not ($uninstall_success)) {
            Invoke-Item $uninstall_log
            Throw [System.Exception] "Failed to uninstall $old_msi.  See $uninstall_log for further info."
        }
    } Else {
        "Could not find existing $channel_name version."
    }

    $install_log = $env:TEMP + "\rust-$channel-install.log"
    Remove-Item $install_log -ErrorAction SilentlyContinue

    "Downloading $msi"
    #$client.DownloadFile("http://static.rust-lang.org/dist/rust-$channel-x86_64-pc-windows-gnu.msi", "$msi")
    [io.file]::WriteAllBytes("$msi",(Invoke-WebRequest -URI "http://static.rust-lang.org/dist/rust-$channel-x86_64-pc-windows-gnu.msi" -Headers @{"Accept-Encoding"="gzip, deflate"}).content)

    "Validating $msi_name"
    $sha256 = (Get-FileHash $msi -Algorithm SHA256 | Format-Wide -Property Hash -AutoSize) | Out-String
    $sha256 = $sha256.Trim()
    Select-String -Pattern $sha256 -Path "$msi.sha256" -SimpleMatch -Quiet -OutVariable hash_check >$null
    Select-String -Pattern $msi_name -Path "$msi.sha256" -CaseSensitive -SimpleMatch -Quiet -OutVariable name_check >$null
    If (-Not ($hash_check -and $name_check)) {
        Throw [System.IO.InvalidDataException] "Failed to validate $msi."
    }

    "Installing $channel_name version"
    Start-Job { msiexec /package $args[0] /quiet /norestart /log $args[1] } -Args $msi,$install_log >$null

    # Wait-Job and Receive-Job aren't reliable for waiting for the installation to complete nor to find the result of the
    # installation.  We can work around this by waiting for the install log to get generated and then read its contents.
    $timeout = New-TimeSpan -Minutes 5
    $timer = [Diagnostics.Stopwatch]::StartNew()
    $install_success = $false
    While (-Not ($install_success -or ($timer.Elapsed -gt $timeout))) {
        Start-Sleep -Milliseconds 100
        If (-Not (Test-Path $install_log)) { Continue }
        Select-String -Pattern " -- (Configuration|Installation) completed successfully\." -Path $install_log -CaseSensitive -Quiet -OutVariable install_success >$null
    }

    # Check install log was created.
    If (-Not (Test-Path $install_log)) {
        Throw [System.Exception] "Failed to install $msi.  Install log missing."
    }

    # Check install log shows success
    If (-Not ($install_success)) {
        Invoke-Item $install_log
        Throw [System.Exception] "Failed to install $msi.  See $install_log for further info."
    }

    # Get install location and version from install log.
    Select-String -Pattern "Property\(S\): ProductVersion = ([0-9]\.[0-9])" -Path $install_log | % {$_.Matches} | % {$_.Groups[1].Value} -OutVariable version >$null
    Select-String -Pattern "Property\(S\): INSTALLDIR = (.*$version)[\\]?" -Path $install_log -CaseSensitive | % {$_.Matches} | % {$_.Groups[1].Value} -OutVariable install_dir >$null

    # Move .msi to install folder to allow for subsequent uninstall if required by user
    Move-Item "$msi" "$install_dir" -Force
    Remove-Item "$msi.sha256" -ErrorAction SilentlyContinue

    # Set environment variables for batch script to use when launching Rust console, and for Jenkins to use
    [Environment]::SetEnvironmentVariable("RUST_" + $channel.ToUpper(), "$install_dir", "Machine")
    If ($stable) {
        [Environment]::SetEnvironmentVariable("RUST_STABLE", "$install_dir", "Machine")
    }

    # Restart Jenkins slave service (ignore error since it may not exist)
    Restart-Service jenkinsslave-C__J -ErrorAction SilentlyContinue

    # Get newly-installed version and display result
    $env:Path = "$install_dir\bin;$env:Path"
    $new_version = (rustc --version) | Out-String
    $new_version = $new_version.Trim()

    $foreground_colour = (Get-Host).UI.RawUI.ForegroundColor.ToString()
    (Get-Host).UI.RawUI.ForegroundColor = "green"
    "Successfully installed $new_version to $install_dir"
    (Get-Host).UI.RawUI.ForegroundColor = $foreground_colour
}

$logfile = $env:TEMP + "\RustUpdate.log"
Start-Transcript -Path $logfile -Append

If (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    $foreground_colour = (Get-Host).UI.RawUI.ForegroundColor.ToString()
    (Get-Host).UI.RawUI.ForegroundColor = "red"
    "You need to run this script as an Administrator."
    (Get-Host).UI.RawUI.ForegroundColor = $foreground_colour
    Exit 1
} Else {
    Install nightly
    Install beta
    $stable_version = GetStableVersion | Out-String
    $stable_version = $stable_version.Trim()
    Install $stable_version
    Exit 0
}
