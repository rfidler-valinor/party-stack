import { createFileRoute } from "@tanstack/react-router";
import { QueryLab } from "../query-demo/QueryLab";

export const Route = createFileRoute("/query-lab")({
    component: QueryLab,
});
