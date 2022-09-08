import os, errno

# https://stackoverflow.com/questions/10840533/most-pythonic-way-to-delete-a-file-which-may-not-exist
def silentremove(filename):
    try:
        os.remove(filename)
    except OSError as e: # this would be "except OSError, e:" before Python 2.6
        if e.errno != errno.ENOENT: # errno.ENOENT = no such file or directory
            raise # re-raise exception if a different error occurred


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

cwd = os.getcwd().split("/")[-1]
print("Rumpkit\nCurrent folder:", cwd)


subfolders, files = run_fast_scandir("..")


for file in files:
    _file = file.replace(f"../", "", 1).replace(cwd, "", 1).replace("/", "", 1)
    if _file.endswith(".min.js"):
        print(_file)
        silentremove(_file)
    if "index.html" in _file and not _file.startswith("template"):
        print(_file)
        silentremove(_file)
