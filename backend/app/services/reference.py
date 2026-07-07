from pydantic import BaseModel

from app.schemas.weather_message import ProductTypeInfo
from app.services.ingest.forecast_offices import list_known_offices


class ReferenceOffice(BaseModel):
    code: str
    name: str


class ReferenceCatalogResponse(BaseModel):
    product_types: list[ProductTypeInfo]
    offices: list[ReferenceOffice]


def get_reference_catalog() -> ReferenceCatalogResponse:
    from app.services.messages import get_product_type_catalog

    return ReferenceCatalogResponse(
        product_types=get_product_type_catalog(),
        offices=[
            ReferenceOffice(code=office["code"], name=office["name"])
            for office in list_known_offices()
        ],
    )
