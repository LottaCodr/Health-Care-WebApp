import { Card, CardContent, CardTitle } from '@/components/ui/card';


type Prop = {
    icon: any,
    waitingForRole: string,
    waitingForNumber: number;
}

export function NurseDashboardCard({ icon, waitingForNumber, waitingForRole }: Prop) {
    return (
        <Card className="w-full rounded-lg max-w-sm bg-white">
            <CardContent className="flex flex-col gap-4 py-8 px-6 bg-white">
                <div className="items-center justify-center">
                    <span className="text-primary text-4xl">
                        <svg className="hidden" />
                        {icon}
                    </span>
                    <p className="text-gray-500 font-semibold uppercase text-lg mb-4"> {waitingForRole} Queue</p>
                </div>
                <h1 className="font-extrabold text-6xl md:text-7xl text-gray-900">{waitingForNumber}</h1>
                <p className="text-gray-500 font-semibold capitalize text-lg mb-4"> waiting for {waitingForRole}</p>
            </CardContent>
        </Card>
    );
}