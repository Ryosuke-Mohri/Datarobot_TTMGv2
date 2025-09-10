import { Skeleton } from '@/components/ui/skeleton';

const ChatLoadingScreen = () => {
    return (
        <div className="flex flex-col flex-1 space-y-4 p-4 w-full min-h-[calc(100vh-4rem)]">
            <div className="flex space-x-4 items-center">
                <Skeleton className="w-[36px] h-[36px] rounded-[100px]" />
                <Skeleton className="w-1/7 h-6" />
            </div>
            <Skeleton className="w-2/3 h-6 mb-9" />
            <div className="flex space-x-4 items-center">
                <Skeleton className="w-[36px] h-[36px] rounded-[100px]" />
                <Skeleton className="w-1/6 h-6" />
            </div>
            <Skeleton className="w-full h-6" />
            <Skeleton className="w-5/6 h-6" />
            <Skeleton className="w-1/2 h-6" />
            <div className="flex flex-col flex-1"></div>
            <Skeleton className="w-full h-18" />
        </div>
    );
};

export { ChatLoadingScreen };
