# Windows Installers

On each of the Windows build machines in the office (one 32-bit, one 64-bit, both Windows 7) do the following process:

- Open C:\MaidSafe\safe_vault\installer\windows\safe_vault_32_and_64_bit.aip in a text editor
- Search for the phrase `Enter path to certificate.p12` and replace it with the actual path to the certificate
- Open a **Powershell** terminal and run the following commands:

```batch
. rustup update
. "C:\Program Files\Git\bin\git.exe" -C C:\MaidSafe\QA pull

cd C:\MaidSafe\safe_vault
. "C:\Program Files\Git\bin\git.exe" pull

. installer\windows\create_installer.ps1

. "C:\Program Files\Git\bin\git.exe" checkout .
```
