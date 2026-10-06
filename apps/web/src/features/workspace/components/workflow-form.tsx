import { useState, type FormEvent } from "react"
import type { WorkflowDefinition } from "@workspace/shared/contracts/api"
import { Button } from "@workspace/ui/components/button"
import type { WorkspaceModel } from "../hooks/use-workspace"
import { fieldClass } from "./installation-form"

const fields = [
  ["name", "Workflow name", "Subscription entitlement"],
  ["entrypoint", "Entrypoint", "src/webhooks/subscription.ts"],
  ["baseSha", "Repository commit SHA", "Full 40-character commit SHA"],
  ["provider", "Provider", "Your selected provider"],
  ["sdkVersion", "Resolved SDK version", "Exact installed version"],
  ["apiVersion", "Effective API version", "Leave blank if unknown"],
  ["targetVersion", "Approved target version", "Exact target version"],
  [
    "assertionArtifactHash",
    "Assertion artifact SHA-256",
    "64-character hash of the test bundle",
  ],
] as const
export function WorkflowForm({ model }: { model: WorkspaceModel }) {
  const workflow = model.data?.workflow
  const initial = workflow?.definition
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map(([key]) => [key, initial?.[key] ?? ""]))
  )
  const [paths, setPaths] = useState(initial?.allowedPaths.join("\n") ?? "")
  const [commands, setCommands] = useState(
    initial?.checkCommands.join("\n") ?? ""
  )
  const [assertions, setAssertions] = useState(
    initial?.assertions.map((item) => item.description).join("\n") ?? ""
  )
  const [sources, setSources] = useState(initial?.sourceUrls.join("\n") ?? "")
  const lines = (text: string) =>
    text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
  async function submit(event: FormEvent) {
    event.preventDefault()
    const definition: WorkflowDefinition = {
      name: values.name,
      entrypoint: values.entrypoint,
      baseSha: values.baseSha,
      provider: values.provider,
      sdkVersion: values.sdkVersion,
      apiVersion: values.apiVersion || null,
      targetVersion: values.targetVersion,
      assertionArtifactHash: values.assertionArtifactHash,
      allowedPaths: lines(paths),
      checkCommands: lines(commands),
      sourceUrls: lines(sources),
      assertions: lines(assertions).map((description, index) => ({
        id: `assertion-${index + 1}`,
        description,
      })),
    }
    await model.execute(`${model.base}/workflows`, definition)
  }
  return (
    <div className="space-y-6">
      {workflow && (
        <section className="border border-border bg-card p-5">
          <h2 className="text-sm">
            Revision {workflow.number} ·{" "}
            {workflow.approvedAt ? "Approved" : "Awaiting your approval"}
          </h2>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            Approval binds the saved assertions, test artifact hash, target
            version, paths, and checks. Editing creates a new revision and
            invalidates prior approval.
          </p>
          <details className="mt-4 text-xs">
            <summary className="cursor-pointer">
              Review the saved approval contract
            </summary>
            <pre className="mt-3 max-h-80 overflow-auto border border-border bg-background p-4 text-[11px]">
              {JSON.stringify(workflow.definition, null, 2)}
            </pre>
          </details>
          {!workflow.approvedAt && (
            <Button
              className="mt-4"
              disabled={model.busy}
              onClick={() =>
                void model.execute(`${model.base}/approvals`, {
                  workflowId: workflow.id,
                  assertionArtifactHash:
                    workflow.definition.assertionArtifactHash,
                })
              }
            >
              Approve saved revision {workflow.number}
            </Button>
          )}
        </section>
      )}
      <form
        className="space-y-6 border-2 border-border bg-card p-6"
        onSubmit={(event) => void submit(event)}
      >
        <h2 className="font-heading text-2xl">
          {workflow ? "Create the next revision." : "Define your workflow."}
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {fields.map(([key, label, placeholder]) => (
            <label key={key} className="block text-xs">
              {label}
              <input
                className={fieldClass}
                required={key !== "apiVersion"}
                value={values[key]}
                onChange={(event) =>
                  setValues({ ...values, [key]: event.target.value })
                }
                placeholder={placeholder}
                pattern={
                  key === "baseSha"
                    ? "[a-f0-9]{40}"
                    : key === "assertionArtifactHash"
                      ? "[a-f0-9]{64}"
                      : undefined
                }
              />
            </label>
          ))}
        </div>
        {[
          {
            label: "Allowed source paths · one per line, up to five",
            value: paths,
            set: setPaths,
          },
          {
            label: "Existing check commands · one per line",
            value: commands,
            set: setCommands,
          },
          {
            label: "Observable assertions · one per line",
            value: assertions,
            set: setAssertions,
          },
          {
            label: "Official HTTPS source URLs · one per line",
            value: sources,
            set: setSources,
          },
        ].map(({ label, value, set }) => (
          <label key={label} className="block text-xs">
            {label}
            <textarea
              required
              value={value}
              onChange={(event) => set(event.target.value)}
              className={`${fieldClass} h-24 py-3`}
            />
          </label>
        ))}
        <p className="text-xs leading-6 text-muted-foreground">
          Saving records your declared inventory. Repository scanning and
          provider evidence must validate it before verification. Check commands
          are stored here; they are never executed by the API.
        </p>
        <Button disabled={model.busy} type="submit">
          {model.busy ? "Saving…" : "Save workflow revision"}
        </Button>
      </form>
    </div>
  )
}
