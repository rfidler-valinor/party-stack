import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const generatedDataDir = path.join(rootDir, "temp", "data");
const generatedFiles = [
    "draft-mappings.json",
    "embeddings-index.json",
    "embeddings.i8",
    "mapping-audit.json",
] as const;

function generatedDataPlugin(): Plugin {
    function serveGeneratedData(
        server: Parameters<NonNullable<Plugin["configureServer"]>>[0] | Parameters<NonNullable<Plugin["configurePreviewServer"]>>[0]
    ) {
        server.middlewares.use("/generated-data", async (request, response, next) => {
            const fileName = path.basename(request.url?.split("?")[0] ?? "");
            if (!generatedFiles.includes(fileName as (typeof generatedFiles)[number])) {
                next();
                return;
            }
            try {
                response.setHeader(
                    "Content-Type",
                    fileName.endsWith(".json") ? "application/json" : "application/octet-stream"
                );
                response.end(await readFile(path.join(generatedDataDir, fileName)));
            } catch {
                next();
            }
        });
    }

    return {
        name: "icon-lab-generated-data",
        configureServer(server) {
            serveGeneratedData(server);
        },
        configurePreviewServer(server) {
            serveGeneratedData(server);
        },
        async generateBundle() {
            for (const fileName of generatedFiles) {
                this.emitFile({
                    type: "asset",
                    fileName: `generated-data/${fileName}`,
                    source: await readFile(path.join(generatedDataDir, fileName)),
                });
            }
        },
    };
}

export default defineConfig({
    server: {
        port: 5179,
        host: true,
    },
    plugins: [react(), tailwindcss(), generatedDataPlugin()],
    resolve: {
        alias: {
            "@": path.resolve(rootDir, "src"),
        },
    },
});
