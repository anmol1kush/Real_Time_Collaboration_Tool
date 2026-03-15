import React from "react";
import { Card, CardHeader, CardFooter, Image } from "@nextui-org/react";

const features = [
  {
    id: 1,
    name: "REAL-TIME COLLABORATION",
    desc: "Edit code & documents together",
    span: "col-span-12 sm:col-span-4",
    height: "h-[300px]",
    src: 'https://assets.technologynetworks.com/production/dynamic/images/content/406893/optibrium-enables-real-time-collaboration-with-stardrop-8-406893-960x540.jpg?cb=13611145',
  },
  {
    id: 2,
    name: "TASK MANAGEMENT",
    desc: "Organize & track project tasks",
    span: "col-span-12 sm:col-span-4",
    height: "h-[300px]",
    src: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: 3,
    name: "PROGRESS TRACKING",
    desc: "Monitor your team's progress",
    span: "col-span-12 sm:col-span-4",
    height: "h-[300px]",
    src: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: 4,
    name: "INSTANT COMMUNICATION",
    desc: "Connect with your team instantly",
    span: "col-span-12 sm:col-span-5",
    height: "h-[300px]",
    src: "https://thumbs.dreamstime.com/z/live-chat-chatting-communication-digital-web-concept-72020923.jpg",
  },
  {
    id: 5,
    name: "VISUAL STUDIO CODE",
    desc: "Experience seamless collaboration on the most loved code editor.",
    span: "col-span-12 sm:col-span-7",
    height: "h-[300px]",
    src: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=1200",
  },
];

export default function FeatureCard() {
  return (
    <>
      <h2
        id="scroll-to-features"
        className="text-6xl font-medium my-5 px-[8%] text-white"
      >
        Features
      </h2>

      <div className="px-[8%] bg-black gap-8 grid grid-cols-12 grid-rows-2 mb-14">
        {features.map((f) => (
          <Card
            key={f.id}
            className={`bg-black ${f.span} ${f.height} hover:scale-105 transition duration-300`}
          >
            <CardHeader className="absolute z-10 top-1 flex-col items-start">
              <p className="text-tiny text-white uppercase font-bold tracking-widest font-mono">
                {f.name}
              </p>
              <h4 className="text-white font-medium text-small font-mono mt-1">
                {f.desc}
              </h4>
            </CardHeader>
            <Image
              removeWrapper
              alt={f.name}
              className="z-0 w-full h-full object-cover opacity-80"
              src={f.src}
            />
          </Card>
        ))}
      </div>
    </>
  );
}