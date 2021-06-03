import * as React from 'react'
import {
  Input,
  InputGroup,
  InputRightElement,
  VStack,
  Button,
  Divider,
  Center,
  Box,
  useToast,
} from '@chakra-ui/react'
import { useHistory } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { setCredentials } from './authSlice'

import { ProtectedComponent } from './ProtectedComponent'
import { useLoginMutation } from '../../app/services/auth'
import type { LoginRequest } from '../../app/services/auth'

function PasswordInput({
  name,
  onChange,
}: {
  name: string
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
}) {
  const [show, setShow] = React.useState(false)
  const handleClick = () => setShow(!show)

  return (
    <InputGroup size="md">
      <Input
        pr="4.5rem"
        type={show ? 'text' : 'password'}
        placeholder="Enter password"
        name={name}
        onChange={onChange}
      />
      <InputRightElement width="4.5rem">
        <Button h="1.75rem" size="sm" onClick={handleClick}>
          {show ? 'Hide' : 'Show'}
        </Button>
      </InputRightElement>
    </InputGroup>
  )
}

export const Login = () => {
  const dispatch = useDispatch()
  const { push } = useHistory()
  const toast = useToast()

  const [formState, setFormState] = React.useState<LoginRequest>({
    username: '',
    password: '',
  })

  const [login, { isLoading }] = useLoginMutation()

  const handleChange = ({
    target: { name, value },
  }: React.ChangeEvent<HTMLInputElement>) =>
    setFormState((prev) => ({ ...prev, [name]: value }))

  return (
    <Center h="500px">
      <VStack spacing="4">
        <Box>Hint: enter anything, or leave it blank and hit login</Box>
        <InputGroup>
          <Input
            onChange={handleChange}
            name="username"
            type="text"
            placeholder="Email"
          />
        </InputGroup>

        <InputGroup>
          <PasswordInput onChange={handleChange} name="password" />
        </InputGroup>
        <Button
          isFullWidth
          onClick={async () => {
            try {
              const user = await login(formState).unwrap()
              dispatch(setCredentials(user))
              push('/')
            } catch (err) {
              toast({
                status: 'error',
                title: 'Error',
                description: 'Oh no, there was an error!',
                isClosable: true,
              })
            }
          }}
          colorScheme="green"
          isLoading={isLoading}
        >
          Login
        </Button>
        <Divider />
        <ProtectedComponent />
      </VStack>
    </Center>
  )
}

export default Login
