import re

with open("aquila-frontend/src/app/monitoring/page.tsx", "r") as f:
    content = f.read()

# Replace hardcoded dark background classes
content = content.replace("bg-[#0b131f]", "bg-surface")
content = content.replace("bg-[#0d1829]", "bg-surface-container-lowest")
content = content.replace("bg-[#101c2d]", "bg-surface-container-lowest")
content = content.replace("bg-[#0b1420]", "bg-surface-container-low")
content = content.replace("bg-[#122033]", "bg-surface-container-low")
content = content.replace("bg-[#14263d]", "bg-primary/10")
content = content.replace("bg-[#060c14]", "bg-surface-dim")

# Text colors
content = content.replace("text-cyan-400", "text-primary")
content = content.replace("text-cyan-300", "text-primary")
content = content.replace("text-emerald-400", "text-success")
content = content.replace("text-emerald-300", "text-success")
content = content.replace("text-amber-400", "text-tertiary")
content = content.replace("text-amber-300", "text-tertiary")
content = content.replace("text-zinc-500", "text-on-surface-variant")
content = content.replace("text-zinc-400", "text-on-surface-variant")

# Background utilities
content = content.replace("bg-cyan-500/20", "bg-primary/15")
content = content.replace("bg-cyan-400", "bg-primary")
content = content.replace("bg-emerald-500/15", "bg-success/15")
content = content.replace("bg-emerald-500/20", "bg-success/20")
content = content.replace("bg-emerald-400", "bg-success")
content = content.replace("bg-amber-500/15", "bg-tertiary/15")
content = content.replace("bg-amber-400", "bg-tertiary")
content = content.replace("bg-zinc-500/10", "bg-surface-variant")
content = content.replace("bg-zinc-600", "bg-outline")

# Border colors
content = content.replace("border-cyan-400", "border-primary")
content = content.replace("border-cyan-500/30", "border-primary/30")
content = content.replace("border-emerald-500/30", "border-success/30")
content = content.replace("border-emerald-500/20", "border-success/20")
content = content.replace("border-amber-500/30", "border-tertiary/30")
content = content.replace("border-zinc-500/20", "border-outline-variant")

# Layout
content = content.replace("w-[460px]", "w-[520px] lg:w-[600px]")

# Map legend colors
content = content.replace("bg-[#00E5FF] border-b border-dashed border-[#00E5FF]", "bg-primary border-b border-dashed border-primary")

with open("aquila-frontend/src/app/monitoring/page.tsx", "w") as f:
    f.write(content)
