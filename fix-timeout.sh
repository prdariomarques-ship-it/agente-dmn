sed -i 's/const obsOutput = await agent.observe(task, execution);/const obsOutput = await agent.observe(task, execution);\n                 if (isTimeout) return;/' src/core/engine.ts
sed -i 's/const thinkOutput = await agent.think(task, execution);/const thinkOutput = await agent.think(task, execution);\n                if (isTimeout) return;/' src/core/engine.ts
sed -i 's/const actOutput = await agent.act(task, execution);/const actOutput = await agent.act(task, execution);\n                 if (isTimeout) return;/' src/core/engine.ts
