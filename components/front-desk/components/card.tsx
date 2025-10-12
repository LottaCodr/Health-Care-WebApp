import { Card, CardContent, CardTitle } from '@/components/ui/card';


type Prop = {
    icon: any,
    waitingForRole: string,
    waitingForNumber: number;
}

export function NurseDashboardCard({icon, waitingForNumber, waitingForRole}: Prop) {
    return (
        <Card className="w-full max-w-sm bg-white">
            <CardContent className="flex flex-col gap-4 py-8 px-6 bg-white">
                <div className="items-center justify-center">
                    <span className="text-primary text-4xl">
                        <svg className="hidden" />
                        {icon}
                    </span>
                    <p className="text-gray-500 font-semibold text-lg mb-4">Waiting for {waitingForRole}</p>
                </div>
                <h1 className="font-semibold text-3xl md:text-6xl mb-1">{waitingForNumber}</h1>
            </CardContent>
        </Card>
    );
}