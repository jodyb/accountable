"""Pydantic models for CRM input and output, with the required-field rules."""

from datetime import UTC, date, datetime
from typing import Annotated, ClassVar, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, field_validator

from accountable.crm.stages import Stage
from accountable.errors import FieldError

Status = Literal["lead", "qualified", "customer"]
UserActivityType = Literal["note", "call", "email"]
ActivityType = Literal["note", "call", "email", "stage_change"]


def _required_text(message: str):
    def check(v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError(message)
        return v

    return AfterValidator(check)


def _optional_text(v: str | None) -> str | None:
    if v is None:
        return None
    v = v.strip()
    return v or None


OptText = Annotated[str | None, AfterValidator(_optional_text)]
OrgName = Annotated[str, _required_text("Enter a name.")]
ContactName = Annotated[str, _required_text("Enter a name.")]
DealName = Annotated[str, _required_text("Enter a deal name.")]
Description = Annotated[str, _required_text("Enter a description.")]
ValueCents = Annotated[int, Field(ge=0)]
Probability = Annotated[int, Field(ge=0, le=100)]


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Output(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    @field_validator("created_at", "updated_at", mode="after", check_fields=False)
    @classmethod
    def _utc(cls, v: datetime) -> datetime:
        return v.replace(tzinfo=UTC) if v.tzinfo is None else v


class Patch(Input):
    """PATCH bodies: only sent fields change. Required fields can't be cleared."""

    required_fields: ClassVar[tuple[str, ...]] = ()

    def changes(self, exclude: set[str] | None = None) -> dict:
        """The fields that were sent, refusing null for a required field."""
        sent = self.model_dump(exclude_unset=True, exclude=exclude)
        for name in self.required_fields:
            if name in sent and sent[name] is None:
                raise FieldError(name, "Required.")
        return sent


# ---- Organizations ----


class OrganizationIn(Input):
    name: OrgName
    website: OptText = None
    industry: OptText = None
    notes: OptText = None


class OrganizationPatch(Patch):
    required_fields: ClassVar[tuple[str, ...]] = ("name",)
    name: OrgName | None = None
    website: OptText = None
    industry: OptText = None
    notes: OptText = None


class Organization(Output):
    id: int
    name: str
    website: str | None
    industry: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


class OrganizationRow(Organization):
    contact_count: int
    open_deal_count: int
    open_value_cents: int


# ---- Contacts ----


class ContactIn(Input):
    name: ContactName
    email: OptText = None
    phone: OptText = None
    job_title: OptText = None
    organization_id: int | None = None
    status: Status = "lead"


class ContactPatch(Patch):
    required_fields: ClassVar[tuple[str, ...]] = ("name", "status")
    name: ContactName | None = None
    email: OptText = None
    phone: OptText = None
    job_title: OptText = None
    organization_id: int | None = None
    status: Status | None = None


class Contact(Output):
    id: int
    name: str
    email: str | None
    phone: str | None
    job_title: str | None
    organization_id: int | None
    organization_name: str | None
    status: Status
    created_at: datetime
    updated_at: datetime


# ---- Deals ----


class DealIn(Input):
    name: DealName
    organization_id: int | None = None
    contact_id: int | None = None
    stage: Stage = "New"
    value_cents: ValueCents
    probability: Probability | None = None
    close_date: date | None = None


class DealPatch(Patch):
    required_fields: ClassVar[tuple[str, ...]] = ("name", "stage", "value_cents", "probability")
    name: DealName | None = None
    organization_id: int | None = None
    contact_id: int | None = None
    stage: Stage | None = None
    value_cents: ValueCents | None = None
    probability: Probability | None = None
    close_date: date | None = None
    today: date | None = Field(default=None, description="The browser's local date, used if the stage changes")


class Deal(Output):
    id: int
    name: str
    organization_id: int | None
    organization_name: str | None
    contact_id: int | None
    contact_name: str | None
    stage: Stage
    value_cents: int
    probability: int
    close_date: date | None
    position: int
    created_at: datetime
    updated_at: datetime


class MoveIn(Input):
    stage: Stage
    index: Annotated[int, Field(ge=0)]
    today: date


# ---- Activities ----


class ActivityIn(Input):
    type: UserActivityType
    contact_id: int | None = None
    deal_id: int | None = None
    description: Description
    occurred_on: date
    follow_up_on: date | None = None
    done: bool = False


class ActivityPatch(Patch):
    required_fields: ClassVar[tuple[str, ...]] = ("type", "description", "occurred_on", "done")
    type: UserActivityType | None = None
    contact_id: int | None = None
    deal_id: int | None = None
    description: Description | None = None
    occurred_on: date | None = None
    follow_up_on: date | None = None
    done: bool | None = None


class Activity(Output):
    id: int
    type: ActivityType
    contact_id: int | None
    contact_name: str | None
    deal_id: int | None
    deal_name: str | None
    description: str
    occurred_on: date
    follow_up_on: date | None
    done: bool
    created_at: datetime


# ---- Record pages ----


class OrganizationDetail(Organization):
    contacts: list[Contact]
    deals: list[Deal]


class ContactDetail(Contact):
    organization: Organization | None
    deals: list[Deal]


class DealDetail(Deal):
    organization: Organization | None
    contact: Contact | None
    last_activity_on: date | None


class DeleteImpact(BaseModel):
    contacts: int = 0
    deals: int = 0
    activities: int = 0


# ---- Pipeline ----


class Column(BaseModel):
    stage: Stage
    count: int
    value_cents: int
    expected_cents: float
    deals: list[Deal]


class Board(BaseModel):
    columns: list[Column]
    open_value_cents: int
    open_expected_cents: float


# ---- Dashboard ----


class Kpis(BaseModel):
    open_value_cents: int
    open_expected_cents: float
    open_count: int
    won_this_month_cents: int
    won_this_month_count: int
    win_rate: int | None = Field(description="Percent, won / (won + lost) over 12 months; null with no closed deals")
    won_12m_count: int
    lost_12m_count: int
    late_count: int


class Month(BaseModel):
    month: str = Field(description="YYYY-MM")
    revenue_cents: int
    won_count: int


class FunnelStage(BaseModel):
    stage: Stage
    count: int
    value_cents: int


class FollowUp(Activity):
    overdue: bool


class Dashboard(BaseModel):
    today: date
    kpis: Kpis
    months: list[Month]
    funnel: list[FunnelStage]
    recent_activity: list[Activity]
    follow_ups: list[FollowUp]


class ReseedIn(Input):
    today: date
