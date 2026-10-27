"""Pydantic v2 models mirroring docs/API_CONTRACT.md (contract_version 1) and web/lib/contract/*.ts.

If the contract changes, change the doc, the Zod schemas and this file in the same commit.
"""
from datetime import datetime
from typing import Annotated, Any, ClassVar, Literal, Union

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StrictBool,
    StrictFloat,
    StrictInt,
    StrictStr,
    StringConstraints,
    TypeAdapter,
    field_validator,
    model_serializer,
    model_validator,
)

CONTRACT_VERSION = 1


def _iso(value: str) -> str:
    """ISO 8601 with a UTC offset, like z.iso.datetime({ offset: true })."""
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("timestamp needs a UTC offset")
    return value


class Model(BaseModel):
    # Zod objects drop unknown keys, so extra input is ignored here too.
    model_config = ConfigDict(extra="ignore")
    # Optional fields the JSON must leave out when unset (null is not the same as absent in Zod).
    omit_none: ClassVar[tuple[str, ...]] = ()

    @model_serializer(mode="wrap")
    def _omit_unset(self, handler):
        data = handler(self)
        for key in self.omit_none:
            if data.get(key) is None:
                data.pop(key, None)
        return data


Id = Annotated[str, Field(min_length=1)]
Count = Annotated[int, Field(ge=0)]

# --- datasets -------------------------------------------------------------------------------


class Dataset(Model):
    id: Id
    name: Id
    rows: Count
    columns: Count
    source: Literal["upload", "demo"]
    created_at: str

    _created = field_validator("created_at")(_iso)


class ColumnProfile(Model):
    name: Id
    dtype: Literal["number", "string", "date", "bool", "mixed"]
    nulls: Count
    unique: Count
    sample: list[StrictStr | StrictInt | StrictFloat | None]
    issues: list[str]


class DatasetProfile(Model):
    dataset_id: Id
    rows: Count
    duplicates: Count
    columns: list[ColumnProfile]
    head: list[dict[str, Any]]


class DemoDatasetFile(DatasetProfile):
    """`datasets/<id>.profile.json`: a DatasetProfile plus an optional display name."""

    name: Id | None = None


# --- run events -----------------------------------------------------------------------------

Attempt = Annotated[int, Field(ge=1, le=3)]
Cell = StrictBool | StrictInt | StrictFloat | StrictStr | None


class EventBase(Model):
    contract_version: Literal[1]
    run_id: Id
    seq: Annotated[int, Field(gt=0)]
    ts: str
    # Mock-only replay delay; the live stream never sends it.
    delay_ms: Annotated[int, Field(ge=0)] | None = None
    omit_none = ("delay_ms",)

    _ts = field_validator("ts")(_iso)


class PlanStep(Model):
    id: Id
    goal: Id


class RunStartedEvent(EventBase):
    type: Literal["run_started"]
    question: Id


class ProfileEvent(EventBase):
    type: Literal["profile"]
    profile: DatasetProfile


class PlanEvent(EventBase):
    type: Literal["plan"]
    steps: Annotated[list[PlanStep], Field(min_length=1)]


class StepStartedEvent(EventBase):
    type: Literal["step_started"]
    step_id: Id
    attempt: Attempt


class CodeEvent(EventBase):
    type: Literal["code"]
    step_id: Id
    attempt: Attempt
    language: Literal["python"]
    source: str


class StdoutEvent(EventBase):
    type: Literal["stdout"]
    step_id: Id
    text: str


class ErrorEvent(EventBase):
    type: Literal["error"]
    step_id: Id
    attempt: Attempt
    error_type: Id
    message: str


class RetryEvent(EventBase):
    type: Literal["retry"]
    step_id: Id
    next_attempt: Annotated[int, Field(ge=2, le=3)]
    reason: str


class StepFinishedEvent(EventBase):
    type: Literal["step_finished"]
    step_id: Id
    status: Literal["ok", "failed"]


class ReportEvent(EventBase):
    type: Literal["report"]
    markdown: str
    cited_metrics: list[str]


class RunFinishedEvent(EventBase):
    type: Literal["run_finished"]
    status: Literal["succeeded", "failed", "not_verified"]


# --- artifacts: `type` is always "artifact"; `kind` picks the payload ------------------------


class ChartPayload(Model):
    """Plotly figure JSON: `data` traces plus optional `layout`."""

    data: list[dict[str, Any]]
    layout: dict[str, Any] | None = None
    omit_none = ("layout",)


class TablePayload(Model):
    """Rows are arrays of cells aligned with `columns`; at most 100 rows."""

    columns: Annotated[list[str], Field(min_length=1)]
    rows: Annotated[list[list[Cell]], Field(max_length=100)]

    @model_validator(mode="after")
    def _rows_match_columns(self):
        if any(len(row) != len(self.columns) for row in self.rows):
            raise ValueError("every table row must have one cell per column")
        return self


class MetricPayload(Model):
    name: Id
    value: StrictInt | StrictFloat | StrictStr
    unit: str | None = None
    omit_none = ("unit",)


class ArtifactBase(EventBase):
    type: Literal["artifact"]
    step_id: Id
    title: str


class ChartArtifactEvent(ArtifactBase):
    kind: Literal["chart"]
    payload: ChartPayload


class TableArtifactEvent(ArtifactBase):
    kind: Literal["table"]
    payload: TablePayload


class MetricArtifactEvent(ArtifactBase):
    kind: Literal["metric"]
    payload: MetricPayload


ArtifactEvent = Annotated[
    Union[ChartArtifactEvent, TableArtifactEvent, MetricArtifactEvent], Field(discriminator="kind")
]

RunEvent = Annotated[
    Union[
        RunStartedEvent,
        ProfileEvent,
        PlanEvent,
        StepStartedEvent,
        CodeEvent,
        StdoutEvent,
        ErrorEvent,
        RetryEvent,
        StepFinishedEvent,
        ReportEvent,
        RunFinishedEvent,
        ArtifactEvent,
    ],
    Field(discriminator="type"),
]
RUN_EVENT = TypeAdapter(RunEvent)

# --- runs and REST bodies -------------------------------------------------------------------

RunStatus = Literal["queued", "running", "succeeded", "failed", "not_verified"]


class Run(Model):
    id: Id
    dataset_id: Id
    question: Id
    status: RunStatus
    created_at: str
    events: list[RunEvent]

    _created = field_validator("created_at")(_iso)


class StartRunRequest(Model):
    dataset_id: Id
    question: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class StartRunResponse(Model):
    run_id: Id
