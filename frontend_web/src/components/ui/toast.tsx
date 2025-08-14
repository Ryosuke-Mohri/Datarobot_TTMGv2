import { Toaster as Sonner, ToasterProps } from 'sonner';
import { CircleXIcon, CircleCheck, CircleAlert, Info } from 'lucide-react';

const Toaster = ({ ...props }: ToasterProps) => {
    return (
        <Sonner
            theme="dark"
            richColors
            expand={true}
            duration={10000}
            visibleToasts={4}
            toastOptions={{
                closeButton: true,
            }}
            icons={{
                error: <CircleXIcon />,
                success: <CircleCheck />,
                warning: <CircleAlert />,
                info: <Info />,
            }}
            {...props}
        />
    );
};

export { Toaster };
