if($env:platform -eq 'x86') {
    $env:Path = "C:\MinGW\bin;" + $env:Path;
} else {
    Start-FileDownload "http://libgd.blob.core.windows.net/mingw/mingw-w64-dgn-x86_64-20141001.7z";
    7z x -oC:\ mingw-w64-dgn-x86_64-20141001.7z | findstr /b /c:"Everything is Ok" /c:"Scanning" /c:"Creating archive";
    $env:Path = "C:\MinGW64\bin;" + $env:Path;
}
