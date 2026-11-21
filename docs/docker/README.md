# layerling in Docker with the server folder as its only storage

A step-by-step guide for running the official image with `LAYERLING_SHARED_PROJECTS_DIR` and `LAYERLING_NEW_DESIGNS_ON_SERVER=always`, so that every design is a `.lyl` file on disk and none depends on browser storage (which Safari, for one, clears after seven days without a visit). It covers setup on macOS (OrbStack or Docker Desktop) and Linux, where the data lives, moving designs out of the browser, backups, access from other devices, and an update script that checks the configuration against the new image, backs up the projects folder first and rolls back if the new version does not start.

| | English | Deutsch |
|---|---|---|
| Guide | [en/layerling-docker-guide.md](en/layerling-docker-guide.md) | [de/layerling-docker-anleitung.md](de/layerling-docker-anleitung.md) |
| Compose file | [en/compose.yaml](en/compose.yaml) | [de/compose.yaml](de/compose.yaml) |
| Update script | [en/update.sh](en/update.sh) | [de/update.sh](de/update.sh) |

New to Docker, or on Windows? [en/docker-step-by-step.md](en/docker-step-by-step.md) ([de/docker-schritt-fuer-schritt.md](de/docker-schritt-fuer-schritt.md)) starts from nothing on Windows, macOS and Linux, from installing Docker to designs saved as files, with the update commands and the usual stumbling blocks.

Use one language's `compose.yaml` and `update.sh` together; they differ only in their comments and messages. Put both in a folder of their own, e.g. `~/layerling-docker`, and create `.env` next to them as described in section 5.3 of the guide.

Written by Jürgen Keller with AI assistance, tested on macOS with OrbStack from layerling 1.106.1 to 1.108.0, and given to the project for free use. Sections 6 and 7 describe the start page from 1.110.0 on, where `always` covers every way a design is made. For the shorter setup with the repository's own [`compose.yml`](../../docker/compose.yml), see [Docker in the README](../../README.md#docker).
