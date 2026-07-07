from nwws_receiver import WxWire, WxWireConfig

from app.config import Settings


def create_wx_wire(settings: Settings) -> WxWire:
    """Create an NWWS-OI client configured for NOAA's STARTTLS endpoint.

    NOAA NWWS-OI uses port 5222 with STARTTLS. slixmpp defaults to trying
    direct TLS first, which causes ``SSL: WRONG_VERSION_NUMBER`` on this service.
    """
    config = WxWireConfig(
        username=settings.nwws_user,
        password=settings.nwws_password,
        server=settings.nwws_server,
        port=settings.nwws_port,
        history=settings.nwws_history,
    )
    client = WxWire(config)
    client.enable_direct_tls = False
    client.enable_starttls = True
    return client
