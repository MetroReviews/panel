import os, shutil, uuid, json

def run_fast_scandir(dir):    # dir: str, ext: list
    subfolders, files = [], []

    for f in os.scandir(dir):
        if f.is_dir():
            subfolders.append(f.path)
        if f.is_file():
            files.append(f.path)


    for dir in list(subfolders):
        sf, f = run_fast_scandir(dir)
        subfolders.extend(sf)
        files.extend(f)
    return subfolders, files


subfolders, files = run_fast_scandir("..")

with open("template/index.html") as f:
    r = f.read()

    if os.path.exists("static/ext.css"):
        r = r.replace("$extstyle", """<link rel="stylesheet" href="/static/ext.css?n=$ver" />""")
    else:
        r = r.replace("$extstyle", "")

    r = r.replace("$ver", str(uuid.uuid4()))


tmpid = uuid.uuid4()

with open(f"{tmpid}", "w") as f:
    f.write(r)

cwd = os.getcwd().split("/")[-1]
print("Rumpkit\nCurrent folder:", cwd)

for subfolder in subfolders:
    if ".git" in subfolder or "_" in subfolder or subfolder.startswith(("./template", "./bin")):
        continue
    
    if f"{subfolder}/+route" in subfolders:
        print("Adding", subfolder.replace(f"../", "", 1).replace(cwd, "", 1) or "/")
        shutil.copy2(f"{tmpid}", f"{subfolder}/index.html")

        # Filelist generation support (for +data)
        if f"{subfolder}/+route/@filelist" in files:
            print("Adding", subfolder.replace(f"../", "", 1).replace(cwd, "", 1) or "/", "filelists (due to @filelist)")
            _, _files = run_fast_scandir(f"{subfolder}/+data")

            files = []
            for f in _files:
                fc = f.replace(f"{subfolder}/+data", "") or "/"
                if fc == "/filelist.json":
                    continue
                files.append(fc)

            with open(f"{subfolder}/+data/filelist.json", "w") as f:
                json.dump({"files": files}, f)

try:
    os.remove(f"{tmpid}")
except OSError:
    pass

