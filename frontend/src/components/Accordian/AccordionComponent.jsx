import React from "react";
import { Accordion, AccordionItem } from "@nextui-org/accordion";
import { accordionData } from "../../Data/accordion";

export default function AccordionComponent() {
  return (
    <div className="w-full max-w-[90%] mx-auto p-4 font-mono">
      <h2 className="text-5xl font-bold mb-10 text-white font-mono tracking-wide">FAQ</h2>

      <Accordion
        className="w-full flex-col gap-0 px-0"
        itemClasses={{
          base: "py-2 outline-none border-t border-zinc-900 last:border-b",
          title: "text-white text-2xl font-mono font-bold tracking-wide",
          trigger: "py-6 px-0 data-[hover=true]:bg-transparent",
          indicator: "text-zinc-600 text-sm",
          content: "text-zinc-400 pb-8 font-mono text-xl leading-relaxed tracking-wide",
        }}
        variant="light"
        showDivider={false}
      >
        {accordionData.map(({ key, title, content }) => (
          <AccordionItem
            key={key}
            aria-label={`FAQ ${key}`}
            title={title}
          >
            {content}
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}