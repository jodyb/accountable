"""CRM: the first business area. Its routers, mounted by main.py under /api."""

from fastapi import APIRouter

from accountable.crm import activities, contacts, dashboard, deals, organizations, pipeline

router = APIRouter()
for module in (organizations, contacts, deals, activities, pipeline, dashboard):
    router.include_router(module.router)
