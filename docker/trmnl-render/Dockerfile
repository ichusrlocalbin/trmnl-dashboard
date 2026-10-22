# Approximates TRMNL's production renderer for local PNG previews.
#
# trmnlp already ships Firefox ESR and the ImageMagick quantizer TRMNL uses, but not the fonts
# installed on TRMNL's render servers. The framework's font fallbacks reference Noto Sans CJK
# with local(), so without the fonts Japanese text would fall back to another font.
# See lib/framework/font_fallbacks.rb in usetrmnl/trmnl-framework.
ARG TRMNLP_VERSION=v0.32.1
FROM trmnl/trmnlp:${TRMNLP_VERSION}

USER root
RUN apt-get update \
  && apt-get install -y --no-install-recommends fonts-noto-cjk \
  && rm -rf /var/lib/apt/lists/*

COPY entrypoint.sh /usr/local/bin/trmnl-render-entrypoint
RUN chmod +x /usr/local/bin/trmnl-render-entrypoint
ENTRYPOINT ["/usr/local/bin/trmnl-render-entrypoint"]
