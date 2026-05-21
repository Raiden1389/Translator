@echo on
call "C:\Program Files\Microsoft Visual Studio\18\Community\VC\Auxiliary\Build\vcvars64.bat"
echo PATH=%PATH%
echo LIB=%LIB%
echo INCLUDE=%INCLUDE%
cd src-tauri
cargo build --release
